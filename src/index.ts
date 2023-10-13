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
  ttsDefaultVoice: "en-GB-RyanNeural",
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
    "Bearer ",
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


// Grammar
//const grammar = {
//  "the chemical element": {
//    entities: {
//      element_entity: "The element is"
//      //element_entity: "i like oranges"
//    },
//  },
//  "i want to know the atomic number": {
//    entities: {
//      atomicNumber_entity: "The atomic number is"
//    },
//  },
//  "can you tell me the atomic number": {
//    entities: {
//      atomicNumber_entity: "The atomic number is"
//    },
//  }
// }


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


//const checkEntityInGrammar = (entity: string, inputSentence: string) => {
//  const cleanedInput = inputSentence.toLowerCase().replace(/\?$/, '')
//  console.log('Input Sentence: ', cleanedInput)
//  if (cleanedInput in grammar) {
//    if (entity in grammar[cleanedInput].entities) {
//      console.log("GRAMMAR:", grammar[cleanedInput].entities[entity])
//      console.log("TRUE")
//      //return grammar[cleanedInput].entities[entity];
//      return true;
//  }
//}
//  console.log("FALSE")
//  return false;
//};

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
  "can you tell me the atomic number and the atomic weight": {
    entities: ["atomicNumber_entity", "atomicWeight_entity"]
  }
}

// works well with grammar above
//const checkEntityInGrammar = (entity: string, inputSentence: string) => {
//  const cleanedInput = inputSentence.toLowerCase().replace(/\?$/, '');
//  console.log('Input Sentence: ', cleanedInput);
//  if (cleanedInput in grammar) {
//    if (grammar[cleanedInput].entities.includes(entity)) {
//      console.log("GRAMMAR:", grammar[cleanedInput].entities);
//      console.log("TRUE");
//      return true;
//    }
//  }
//  console.log("FALSE");
//  return false;
//};


//just testing
const checkEntityInGrammar = (inputSentence: string) => {
  const cleanedInput = inputSentence.toLowerCase().replace(/\?$/, '');
  console.log('Input Sentence: ', cleanedInput);
  if (cleanedInput in grammar) {
    console.log("GRAMMAR:", grammar[cleanedInput].entities);
    console.log("TRUE");
    return grammar[cleanedInput].entities;
    //return true
  }
  console.log("FALSE");
  return [];
};




// getting a random index for picking a random phrase
const getRandomIndex = (min: number, max: number) => { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

// getting a random phrase when delivering the required data, so it doesn't get too repetitive
const getRandomPhrase = () => {
  const randomPhrase = ["Yes", "Here you go", "Ok", "Wowa"];
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
                entry: say("Hi there, amigo! How can I help you?"),
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
                    const gptData = await fetchFromChatGPT(input.lastResult[0].utterance + "The information should be in JSON format, including the following entities: element_JSON (the name of the chemical element), atomicNumber_JSON and atomicWeight_JSON.", 250);
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
                },
                on: { SPEAK_COMPLETE: "Information" }
              },
              Information: {
                entry: listen(),
                on: {
                  RECOGNISED: [
                    {
                      target: "checkEntities",
                      actions: assign({
                        entities: ({ event }) => {
                          console.log("CHECK ENTITIES ACTIONS");
                          console.log(checkEntityInGrammar(event.value[0].utterance));
                          return checkEntityInGrammar(event.value[0].utterance);
                          //checkEntityInGrammar(event.value[0].utterance);
                        },
                      }),
                    },
                  //  target: "element",
                  //  guard: ({ event }) => {
                  //    console.log('GUARD ELEMENT');
                  //    return checkEntityInGrammar("element_entity", event.value[0].utterance);
                  //  },
                  //  actions: assign ({
                  //    element: ({ event }) => checkEntityInGrammar("element_entity", event.value[0].utterance),
                  //  }),
                  //},
                  //the guard and actions for each entity are now separate, and the checkEntityInGrammar function (latest version)
                  //is called for each entity (no entity: string). 
                  //The reason is that this allows me to handle each entity separately and 
                  //to handle cases where multiple entities are present in the same input sentence
                    {
                      target: "element",
                      guard: ({ event }) => {
                        console.log('GUARD ELEMENT');
                        const entities = checkEntityInGrammar(event.value[0].utterance);
                        console.log('RETURN: ', entities.includes("element_entity"));
                        return entities.includes("element_entity");
                      },
                      actions: assign ({
                        element: ({ event }) => {
                          console.log("ACTIONS ELEMENT");
                          console.log('RETURN: ', checkEntityInGrammar(event.value[0].utterance).includes("element_entity"));
                          return checkEntityInGrammar(event.value[0].utterance).includes("element_entity");
                        },
                      }),
                    },
                    {
                      target: "atomicNumber",
                      guard: ({ event }) => {
                        console.log('GUARD ATOMIC NUMBER');
                        const entities = checkEntityInGrammar(event.value[0].utterance);
                        console.log('RETURN: ', entities.includes("atomicNumber_entity"));
                        return entities.includes("atomicNumber_entity");
                      },
                      actions: assign({
                        atomicNumber: ({ event }) => {
                          console.log("ACTIONS ATOMIC NUMBER");
                          console.log('RETURN: ', checkEntityInGrammar(event.value[0].utterance).includes("atomicNumber_entity"));
                          return checkEntityInGrammar(event.value[0].utterance).includes("atomicNumber_entity");
                        },
                      }),
                    },
                    {
                      target: "atomicWeight",
                      guard: ({ event }) => {
                        console.log('GUARD ATOMIC WEIGHT');
                        const entities = checkEntityInGrammar(event.value[0].utterance);
                        console.log('RETURN: ', entities.includes("atomicWeight_entity"));
                        return entities.includes("atomicWeight_entity");
                      },
                      actions: assign({
                        atomicWeight: ({ event }) => {
                          console.log("ACTIONS ATOMIC WEIGHT");
                          console.log('RETURN: ', checkEntityInGrammar(event.value[0].utterance).includes("atomicWeight_entity"));
                          return checkEntityInGrammar(event.value[0].utterance).includes("atomicWeight_entity");
                        },
                      }),
                    },
                  //{
                  //  target: "atomicNumber",
                  //  guard: ({ event }) => {
                  //    console.log('GUARD ATOMIC NUMBER');
                  //    return checkEntityInGrammar("atomicNumber_entity", event.value[0].utterance);
                  //  },
                  //  actions: assign ({
                  //    atomicNumber: ({ event }) => {
                  //      console.log("ACTIONS ATOMIC NUMBER");
                  //      return checkEntityInGrammar("atomicNumber_entity", event.value[0].utterance);
                  //    },
                  //  }),
                  //},
                  //{
                  //  target: "atomicWeight",
                  //  guard: ({ event }) => {
                  //    console.log('GUARD ATOMIC WEIGHT');
                  //    return checkEntityInGrammar("atomicWeight_entity", event.value[0].utterance);
                  //  },
                  //  actions: assign ({
                  //    atomicWeight: ({ event }) => {
                  //      console.log("ACTIONS ATOMIC WEIGHT");
                  //      return checkEntityInGrammar("atomicWeight_entity", event.value[0].utterance);
                  //    },
                  //  }),
                  //},
                ],
                },
              },
              checkEntities: {
                  always: [
                    {
                      // should I have guards here?
                      target: "atomicNumber",
                      cond: ({ entities }) => {
                        console.log('CHECKING ATOMIC NUMBER')
                        entities.includes("atomicNumber_entity");
                      }
                    },
                    {
                      target: "atomicWeight",
                      cond: ({ entities }) => entities.includes("atomicWeight_entity"),
                    },
                    {
                      target: "atomicNumberAndWeight",
                      cond: ({ entities }) =>
                        entities.includes("atomicNumber_entity") &&
                        entities.includes("atomicWeight_entity"),
                    },
                    // handling here other entities maybe
                  ],
              },
              element: {
                entry: ({ context}) => { 
                  context.spstRef.send({ 
                    type: "SPEAK", 
                    value:{ utterance: `${getRandomPhrase()}, the name of the chemical element is ${context.element_JSON}`}
                  });
                },
                on: { SPEAK_COMPLETE: "ByeBye" },
              },
              atomicNumberAndWeight: {
                entry: ({ context }) => {
                  console.log('IN ATOMIC NUMBER AND WEIGHT SPEAK')
                  const utterance = `${getRandomPhrase()}, the atomic number is ${context.atomicNumber_JSON} and the atomic weight is ${context.atomicWeight_JSON}`;
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance }
                  });
                },
                on: { SPEAK_COMPLETE: "ByeBye" },
              },
              atomicNumber: {
                entry: ({ context}) => {
                  console.log('IN ATOMIC NUMBER SPEAK')
                  context.spstRef.send({ 
                    type: "SPEAK", 
                    value:{ utterance: `${getRandomPhrase()}, the atomic number is ${context.atomicNumber_JSON}`}
                  });
                },
                on: { SPEAK_COMPLETE: "ByeBye" },
              },
              atomicWeight: {
                entry: ({ context}) => { 
                  console.log('IN ATOMIC WEIGHT SPEAK')
                  context.spstRef.send({ 
                    type: "SPEAK", 
                    value:{ utterance: `${getRandomPhrase()}, the atomic weight is ${context.atomicWeight_JSON}`}
                  });
                },
                on: { SPEAK_COMPLETE: "ByeBye" },
              },           
              //atomicNumber: {
              //  entry: ({ context }) => {
              //    console.log('IN ATOMIC NUMBER SPEAK')
              //    const utterance = context.atomicWeight
              //      ? `${getRandomPhrase()}, the atomic number is ${context.atomicNumber_JSON} and the atomic weight is ${context.atomicWeight_JSON}`
              //      : `${getRandomPhrase()}, the atomic number is ${context.atomicNumber_JSON}`;
              //    context.spstRef.send({
              //      type: "SPEAK",
              //      value: { utterance }
              //    });
              //  },
              //  on: { SPEAK_COMPLETE: "ByeBye" },
              //},
              //atomicWeight: {
              //  entry: ({ context }) => {
              //    console.log('IN ATOMIC WEIGHT SPEAK')
              //    const utterance = context.atomicNumber
              //      ? `${getRandomPhrase()}, the atomic number is ${context.atomicNumber_JSON} and the atomic weight is ${context.atomicWeight_JSON}`
              //      : `${getRandomPhrase()}, the atomic weight is ${context.atomicWeight_JSON}`;
              //    context.spstRef.send({
              //      type: "SPEAK",
              //      value: { utterance }
              //    });
              //  },
              //  on: { SPEAK_COMPLETE: "ByeBye" },
              //},
              ByeBye: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Adios, besitos`}
                  });
                },
              },
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
