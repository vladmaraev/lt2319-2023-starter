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
    "Bearer <it is a secret shhh>",
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
const grammar = {
  "the chemical element": {
    entities: {
      element_JSON: "The element is"
      //element_JSON: "i like oranges"
    },
  },
  "i want to know the atomic number": {
    entities: {
      atomicNumber_JSON: "The atomic number is"
    },
  },
  "can you tell me the atomic number": {
    entities: {
      atomicNumber_JSON: "The atomic number is"
    },
  }
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


const checkEntityInGrammar = (entity: string, inputSentence: string) => {
  const cleanedInput = inputSentence.toLowerCase().replace(/\?$/, '')
  console.log('Input Sentence: ', cleanedInput)
  if (cleanedInput in grammar) {
    if (entity in grammar[cleanedInput].entities) {
      console.log("grammar", grammar[cleanedInput].entities)
      return grammar[cleanedInput].entities[entity];
  }
}
  return false;
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
                entry: say("Hi there, buddy! How can I help you?"),
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
                    const gptData = await fetchFromChatGPT(input.lastResult[0].utterance + "The information should be in JSON format, including the following entities: element_JSON (the name of the chemical element) and atomicNumber_JSON.", 250);
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
                  RECOGNISED: [{
                    target: "element",
                    guard: ({ event }) => {
                      console.log('GUARD ELEMENT');
                      return checkEntityInGrammar("element_JSON", event.value[0].utterance);
                    },
                    actions: assign ({
                      element: ({ event }) => checkEntityInGrammar("element_JSON", event.value[0].utterance),
                    }),
                  },
                  {
                    target: "atomicNumber",
                    guard: ({ event }) => {
                      console.log('GUARD ATOMIC NUMBER');
                      return checkEntityInGrammar("atomicNumber_JSON", event.value[0].utterance);
                    },
                    actions: assign ({
                      atomicNumber: ({ event }) => {
                        console.log("ACTIONS ATOMIC NUMBER");
                        return checkEntityInGrammar("atomicNumber_JSON", event.value[0].utterance);
                      },
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
                },
                on: { SPEAK_COMPLETE: "ByeBye" },
              },
              atomicNumber: {
                entry: ({ context}) => { 
                  context.spstRef.send({ 
                    type: "SPEAK", 
                    value:{ utterance: `${getRandomPhrase()}, the atomic number is ${context.atomicNumber_JSON}`}
                  });
                },
                on: { SPEAK_COMPLETE: "ByeBye" },
              },
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
