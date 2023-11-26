import { createMachine, createActor, assign, fromPromise } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "",
};


const settings: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  locale: "en-US",
  asrDefaultNoInputTimeout: 5000,
  //ttsDefaultVoice: "en-GB-RyanNeural",
  ttsDefaultVoice: "en-CA-ClaraNeural",
};

interface DMContext {
  spstRef?: any;
  lastResult?: Hypothesis[];
}

// ChatGPT invocation
async function fetchFromChatGPT(prompt: string, max_tokens: number) {
  const myHeaders = new Headers();
  myHeaders.append(
    "Authorization",
    //"Bearer <it is a secret shhh>",
    "Bearer"
  );
  myHeaders.append("Content-Type", "application/json");
  const raw = JSON.stringify({
    model: "gpt-3.5-turbo",
    messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
    temperature: 0,
    max_tokens: max_tokens,
  });

  const response = fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  })
    .then((response) => response.json())
    .then((response) => response.choices[0].message.content);

  return response;
}



// helper functions
const say =
  (text: string) =>
  ({ context }) => {
    context.spstRef.send({
      type: "SPEAK",
      value: { utterance: text },
    });
  };
const listen =
  () =>
  ({ context }) =>
    context.spstRef.send({
      type: "LISTEN",
    });



const grammar = {
  "the chemical element": {
    entities: ["element_entity"]
  },
  "i want to know the atomic number": {
    entities: ["atomicNumber_entity"]
  },
  "can you tell me the atomic number": {
    entities: ["atomicNumber_entity"]
  },
  "the atomic number": {
    entities: ["atomicNumber_entity"]
  },
  "yes, i want to know the atomic number": {
    entities: ["atomicNumber_entity"]
  },
  "yes, can you tell me the atomic number": {
    entities: ["atomicNumber_entity"]
  },
  "what's the atomic number": {
    entities: ["atomicNumber_entity"]
  },
  "the atomic weight": {
    entities: ["atomicWeight_entity"]
  },
  "the melting point": {
    entities: ["meltingPoint_entity"]
  },
  "the boiling point": {
    entities: ["boilingPoint_entity"]
  },
  "the electron configuration": {
    entities: ["electronConfig_entity"]
  },
  "yes": {
    entities: ["affirmative_entity"]
  },
  "yes, please": {
    entities: ["affirmative_entity"]
  },
  "no": {
    entities: ["negative_entity"]
  },
  "no, thank you": {
    entities: ["negative_entity"]
  },
  "what is it used for": {
    entities: ["usage_entity"]
  }
  // The reason to have a list of entities was because I was trying
  //to handle several entities in a shot, as in:
  //"can you tell me the atomic number and the atomic weight": {
  //  entities: ["atomicNumber_entity", "atomicWeight_entity"]
  //}
}


const grammar_update = {
  element_entity: ["chemical element"],
  atomicNumber_entity: ["atomic number"],
  atomicWeight_entity: ["atomic weight"],
  meltingPoint_entity: ["melting point"],
  boilingPoint_entity: ["boiling point"],
  electronConfig_entity: ["electron configuration"],
  usage_entity: ["what is it used for", "what's the use"],
  negative_entity: ["no", "no, thanks", "no, thank you", "it's ok", "that's enough"]
}




function checkResponse(response: object, grammar: { [key: string]: string[] }) {
  let responseStr = JSON.stringify(response);
  
  const keys = ['atomicNumber_entity', 'element_entity'];
  for (const key of keys) {
    const phrases = grammar[key];
    for (const phrase of phrases) {
      if (responseStr.toLowerCase().includes(phrase.toLowerCase())) {
        console.log('phrase: ', phrase)
        return true;
        //return key;
      }
    }
  }
  return null;
}


// works well with grammar above
//const checkEntityInGrammar = (entity: string, inputSentence: string) => {
//  const cleanedInput = inputSentence.toLowerCase().replace(/\?$/, '');
//  console.log('Input Sentence: ', cleanedInput);
//  if (cleanedInput in grammar) {
//    //console.log('YES, SENT IN GRAMMAR')
//    if (grammar[cleanedInput].entities.includes(entity)) {
//      console.log("GRAMMAR:", grammar[cleanedInput].entities);
//      //console.log("TRUE");
//      return true;
//    }
//  }
//  console.log("FALSE");
//  //console.log("GRAMMAR FALSE:", grammar[cleanedInput].entities)
//  return false;
//};


// updated checkEntityInGrammar
const checkEntityInGrammar = (inputSentence: string) => {
  const cleanedInput = inputSentence.toLowerCase().replace(/\?$/, '');
  console.log('Input Sentence: ', cleanedInput);
 
  for (let entity in grammar_update) {
    for (let phrase of grammar_update[entity]) {
      if (cleanedInput.includes(phrase)) {
        console.log("GRAMMAR:", entity);
        return entity;
      }
    }
  }
  console.log("FALSE");
  return false;
 };
 





const randomPhrase = ["yes", "here you go", "ok", "wowa", "great", "sure", "fantastic", "alright"];

// getting a random index for picking a random phrase
const getRandomIndex = (min: number, max: number) => { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

// getting a random phrase when delivering the required data, so it doesn't get too repetitive
const getRandomPhrase = () => {
  const index = randomPhrase[getRandomIndex(0, randomPhrase.length)]
  return randomPhrase[getRandomIndex(0, randomPhrase.length)];
}


// machine
const dmMachine = createMachine(
  {
    id: "root",
    type: "parallel",
    states: {
      DialogueManager: {
        initial: "Prepare",
        states: {
          Prepare: {
            on: { ASRTTS_READY: "Ready" },
            entry: [
              assign({
                spstRef: ({ spawn }) => {
                  return spawn(speechstate, {
                    input: {
                      settings: settings,
                    },
                  });
                },
              }),
            ],
          },
          Ready: {
            initial: "HowCanIHelp",
            states: {
              HowCanIHelp: {
                entry: say("Hi, buddy! I am LiNa and I know everything about chemical elements. Tell me which one you want to learn about and I will give you some info."),
                //entry: say("Hi, blablabla"),
                on: { SPEAK_COMPLETE: "Ask" },
              },
              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "AskChatGPT",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                  },
                },
              },
              AskChatGPT: {
                invoke: {
                  src: fromPromise(async({ input }) => {
                    const gptData = await fetchFromChatGPT(input.lastResult[0].utterance + "The information should be in JSON format, including the following entities: element_JSON (the name of the chemical element), atomicNumber_JSON, atomicWeight_JSON, meltingPoint_JSON, boilingPoint_JSON, electronConfig_JSON and usage_JSON (what is this chemical element used for).", 150);
                    return gptData;
                  }),
                  input: ({ context, event }) => ({
                    lastResult: context.lastResult,
                  }),
                  onDone: {
                    target: "SayBack",
                    actions: [
                      ({ event }) => console.log(JSON.parse(event.output)),
                      assign({
                        element_JSON: ({ event }) => JSON.parse(event.output).element_JSON,
                        atomicNumber_JSON: ({ event }) => JSON.parse(event.output).atomicNumber_JSON,
                        atomicWeight_JSON: ({ event }) => JSON.parse(event.output).atomicWeight_JSON,
                        meltingPoint_JSON: ({ event }) => JSON.parse(event.output).meltingPoint_JSON,
                        boilingPoint_JSON: ({ event }) => JSON.parse(event.output).boilingPoint_JSON,
                        electronConfig_JSON: ({ event }) => JSON.parse(event.output).electronConfig_JSON,
                        usage_JSON: ({ event }) => JSON.parse(event.output).usage_JSON,
                      }),
                    ],
                  },
                },
              },
              SayBack: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `${getRandomPhrase()}! What do you want to know about ${context.element_JSON}?` }
                  });
                  console.log("Index: ", getRandomIndex(0, randomPhrase.length));
                },
                on: { SPEAK_COMPLETE: "Information" }
              },
              Information: {
                entry: listen(),
                on: {
                  RECOGNISED: [{
                    target: "element",
                    guard: ({ event }) => {
                      //console.log('GUARD ELEMENT');
                      //original return checkEntityInGrammar("element_entity", event.value[0].utterance);
                      const entity = checkEntityInGrammar(event.value[0].utterance);
                      return entity === "element_entity";
                    },
                    actions: assign ({
                      //element: ({ event }) => checkEntityInGrammar("element_entity", event.value[0].utterance),
                      element: ({ event }) => checkEntityInGrammar(event.value[0].utterance),
                    }),
                  },
                  {
                    target: "atomicNumber",
                    guard: ({ event }) => {
                      //console.log('GUARD ATOMIC NUMBER');
                      //return checkEntityInGrammar("atomicNumber_entity", event.value[0].utterance);
                      const entity = checkEntityInGrammar(event.value[0].utterance);
                      return entity === "atomicNumber_entity";
                    },
                    actions: assign ({
                      atomicNumber: ({ event }) => //{
                        //console.log("ACTIONS ATOMIC NUMBER");
                        //return checkEntityInGrammar("atomicNumber_entity", event.value[0].utterance);
                        checkEntityInGrammar(event.value[0].utterance),
                      //},
                    }),
                  },
                  {
                    target: "atomicWeight",
                    guard: ({ event }) => {
                      //console.log('GUARD ATOMIC WEIGHT');
                      //return checkEntityInGrammar("atomicWeight_entity", event.value[0].utterance);
                      const entity = checkEntityInGrammar(event.value[0].utterance);
                      return entity === "atomicWeight_entity";
                    },
                    actions: assign ({
                      atomicWeight:  ({ event }) => //{
                        //console.log("ACTIONS ATOMIC WEIGHT");
                        //return checkEntityInGrammar("atomicWeight_entity", event.value[0].utterance);
                        checkEntityInGrammar(event.value[0].utterance),
                      //},
                    }),
                  },
                  {
                    target: "meltingPoint",
                    guard: ({ event }) => {
                      //console.log('GUARD MELTING POINT');
                      //return checkEntityInGrammar("meltingPoint_entity", event.value[0].utterance);
                      const entity = checkEntityInGrammar(event.value[0].utterance);
                      return entity === "meltingPoint_entity";
                    },
                    actions: assign ({
                      meltingPoint:  ({ event }) => //{
                        //console.log("ACTIONS MELTING POINT");
                        //return checkEntityInGrammar("meltingPoint_entity", event.value[0].utterance);
                        checkEntityInGrammar(event.value[0].utterance),
                      //},
                    }),
                  },
                  {
                    target: "boilingPoint",
                    guard: ({ event }) => {
                      //console.log('GUARD BOILING POINT');
                      //return checkEntityInGrammar("boilingPoint_entity", event.value[0].utterance);
                      const entity = checkEntityInGrammar(event.value[0].utterance);
                      return entity === "boilingPoint_entity";
                    },
                    actions: assign ({
                      boilingPoint:  ({ event }) => //{
                        //console.log("ACTIONS BOILING POINT");
                        //return checkEntityInGrammar("boilingPoint_entity", event.value[0].utterance);
                        checkEntityInGrammar(event.value[0].utterance),
                      //},
                    }),
                  },
                  {
                    target: "electronConfig",
                    guard: ({ event }) => {
                      //console.log('GUARD ELECTRON CONF');
                      //return checkEntityInGrammar("electronConfig_entity", event.value[0].utterance);
                      const entity = checkEntityInGrammar(event.value[0].utterance);
                      return entity === "electronConfig_entity";
                    },
                    actions: assign ({
                      electronConfig:  ({ event }) => //{
                        //console.log("ACTIONS ELECTRON CONF");
                        //return checkEntityInGrammar("electronConfig_entity", event.value[0].utterance);
                        checkEntityInGrammar(event.value[0].utterance),
                      //},
                    }),
                  },
                  {
                    target: "usage",
                    guard: ({ event }) => {
                      //console.log('GUARD USAGE');
                      //return checkEntityInGrammar("usage_entity", event.value[0].utterance);
                      const entity = checkEntityInGrammar(event.value[0].utterance);
                      return entity === "usage_entity";
                    },
                    actions: assign ({
                      usage:  ({ event }) => //{
                        //console.log("ACTIONS USAGE");
                        //return checkEntityInGrammar("usage_entity", event.value[0].utterance);
                        checkEntityInGrammar(event.value[0].utterance),
                      //},
                    }),
                  },
                ],
                },
              },
              element: {
                entry: ({ context}) => { 
                  context.spstRef.send({ 
                    type: "SPEAK", 
                    value:{ utterance: `${getRandomPhrase()}, the name of the chemical element is ${context.element_JSON}`}
                  });
                  console.log("Index: ", getRandomIndex(0, randomPhrase.length));
                },
                on: { SPEAK_COMPLETE: "moreQuestions" },
              },
              atomicNumber: {
                entry: ({ context}) => { 
                  context.spstRef.send({ 
                    type: "SPEAK", 
                    value:{ utterance: `${getRandomPhrase()}, the atomic number is ${context.atomicNumber_JSON}`}
                  });
                  console.log("Index: ", getRandomIndex(0, randomPhrase.length));
                },
                on: { SPEAK_COMPLETE: "moreQuestions" },
              },
              atomicWeight: {
                entry: ({ context}) => { 
                  context.spstRef.send({ 
                    type: "SPEAK", 
                    value:{ utterance: `${getRandomPhrase()}, the atomic weight is ${context.atomicWeight_JSON}`}
                  });
                  console.log("Index: ", getRandomIndex(0, randomPhrase.length));
                },
                on: { SPEAK_COMPLETE: "moreQuestions" },
              },
              meltingPoint: {
                entry: ({ context}) => { 
                  context.spstRef.send({ 
                    type: "SPEAK", 
                    value:{ utterance: `${getRandomPhrase()}, the melting point is ${context.meltingPoint_JSON}ºC.`}
                  });
                  console.log("Index: ", getRandomIndex(0, randomPhrase.length));
                },
                on: { SPEAK_COMPLETE: "moreQuestions" },
              },
              boilingPoint: {
                entry: ({ context}) => { 
                  context.spstRef.send({ 
                    type: "SPEAK", 
                    value:{ utterance: `${getRandomPhrase()}, the boiling point is ${context.boilingPoint_JSON}ºC.`}
                  });
                  console.log("Index: ", getRandomIndex(0, randomPhrase.length));
                },
                on: { SPEAK_COMPLETE: "moreQuestions" },
              },
              electronConfig: {
                entry: ({ context}) => { 
                  context.spstRef.send({ 
                    type: "SPEAK", 
                    value:{ utterance: `${getRandomPhrase()}, the electron configuration is ${context.electronConfig_JSON}.`}
                  });
                  console.log("Index: ", getRandomIndex(0, randomPhrase.length));
                },
                on: { SPEAK_COMPLETE: "moreQuestions" },
              },
              usage: {
                entry: ({ context}) => { 
                  context.spstRef.send({ 
                    type: "SPEAK", 
                    value:{ utterance: `Well, ${context.usage_JSON}.`}
                  });
                  console.log("Index: ", getRandomIndex(0, randomPhrase.length));
                },
                on: { SPEAK_COMPLETE: "moreQuestions" },
              },
              moreQuestions: {
                entry: ({ context}) => { 
                  context.spstRef.send({ 
                    type: "SPEAK", 
                    //value:{ utterance: `Anything else you want to know about ${context.element_JSON}? Say yes or no.`}
                    value:{ utterance: `Anything else you want to know about ${context.element_JSON}?`}
                  });
                },
                //on: { SPEAK_COMPLETE: "yesOrNo" },
                on: { SPEAK_COMPLETE: "CheckResponse" },
              },
              CheckResponse: {
                entry: listen(),
                on: {
                  RECOGNISED: [
                    {
                      target: "atomicNumber",
                      guard: ({ event }) => {
                        const entity = checkEntityInGrammar(event.value[0].utterance);
                        return entity === "atomicNumber_entity";
                      },
                    },
                    {
                      target: "atomicWeight",
                      guard: ({ event }) => {
                        const entity = checkEntityInGrammar(event.value[0].utterance);
                        return entity === "atomicWeight_entity";
                      },
                    },
                    {
                      target: "meltingPoint",
                      guard: ({ event }) => {
                        const entity = checkEntityInGrammar(event.value[0].utterance);
                        return entity === "meltingPoint_entity";
                      },
                    },
                    {
                      target: "boilingPoint",
                      guard: ({ event }) => {
                        const entity = checkEntityInGrammar(event.value[0].utterance);
                        return entity === "boilingPoint_entity";
                      },
                    },
                    {
                      target: "electronConfig",
                      guard: ({ event }) => {
                        const entity = checkEntityInGrammar(event.value[0].utterance);
                        return entity === "electronConfig_entity";
                      },
                    },
                    {
                      target: "usage",
                      guard: ({ event }) => {
                        const entity = checkEntityInGrammar(event.value[0].utterance);
                        return entity === "usage_entity";
                      },
                    },
                    {
                      target: "byeBye",
                      guard: ({ event }) => {
                        const entity = checkEntityInGrammar(event.value[0].utterance);
                        return entity === "negative_entity";
                      },
                    },
                    {
                      // This transition will be taken if none of the previous transitions' guards pass
                      target: "UnrecognizedInput",
                    },
                  ],
                },
              },
              UnrecognizedInput: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "Sorry, I didn't catch that. Can you repeat?" },
                  });
                },
                on: { SPEAK_COMPLETE: "Information" },
              },
              //yesOrNo: {
              //  entry: listen(),
              //  on: {
              //    RECOGNISED: [
              //      {
              //        target: "affirmative",
              //        guard: ({ event }) => checkEntityInGrammar("affirmative_entity", event.value[0].utterance),
              //      },
              //      {
              //        target: "negative",
              //        guard: ({ event }) => checkEntityInGrammar("negative_entity", event.value[0].utterance),
              //      },
              //    ],
              //  },
              //},
              //affirmative: {
              //  entry: ({ context }) => {
              //    context.spstRef.send({
              //      type: "SPEAK",
              //      value: { utterance: `${getRandomPhrase()}, what else do you want to know?`}
              //    });
              //    console.log("Index: ", getRandomIndex(0, randomPhrase.length));
              //  },
              //  on: { SPEAK_COMPLETE: "Information" },
              //},
              //negative: {
              //  entry: ({ context }) => {
              //    context.spstRef.send({
              //      type: "SPEAK",
              //      value: { utterance: `${getRandomPhrase()}, it was nice learning new stuff about ${context.element_JSON} with you!`}
              //    });
              //    console.log("Index: ", getRandomIndex(0, randomPhrase.length));
              //  },
              //  on: { SPEAK_COMPLETE: "byeBye" },
              //},
              byeBye: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `${getRandomPhrase()}, it was nice learning new stuff about ${context.element_JSON} with you! I hope your day is as bright as neon. Goodbye!`}
                  });
                },
              },
              //It'd be nice to add a "canYouRepeat" state
              //IdleEnd: {},
            },
          },
        },
      },
      GUI: {
        initial: "PageLoaded",
        states: {
          PageLoaded: {
            entry: "gui.PageLoaded",
            on: { CLICK: { target: "Inactive", actions: "prepare" } },
          },
          Inactive: { entry: "gui.Inactive", on: { ASRTTS_READY: "Active" } },
          Active: {
            initial: "Idle",
            states: {
              Idle: {
                entry: "gui.Idle",
                on: { TTS_STARTED: "Speaking", ASR_STARTED: "Listening" },
              },
              Speaking: {
                entry: "gui.Speaking",
                on: { SPEAK_COMPLETE: "Idle" },
              },
              Listening: { entry: "gui.Listening", on: { RECOGNISED: "Idle" } },
            },
          },
        },
      },
    },
  },
  {
    // custom actions
    actions: {
      prepare: ({ context }) =>
        context.spstRef.send({
          type: "PREPARE",
        }),
      // saveLastResult:
      "speak.how-can-I-help": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "How can I help you?" },
        }),
      "gui.PageLoaded": ({}) => {
        document.getElementById("button").innerText = "Click to start!";
      },
      "gui.Inactive": ({}) => {
        document.getElementById("button").innerText = "Inactive";
      },
      "gui.Idle": ({}) => {
        document.getElementById("button").innerText = "Idle";
      },
      "gui.Speaking": ({}) => {
        document.getElementById("button").innerText = "Speaking...";
      },
      "gui.Listening": ({}) => {
        document.getElementById("button").innerText = "Listening...";
      },
    },
  },
);

const actor = createActor(dmMachine).start();

document.getElementById("button").onclick = () => actor.send({ type: "CLICK" });

actor.subscribe((state) => {
  console.log(state.value);
});