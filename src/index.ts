import { createMachine, createActor, assign } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "51a782b6273c4bebb54d1e04b0e108e0",
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

interface Grammar {
  [index: string]: {
    entities: {
      [index: string]: string;
    };
   },
  };

const grammar: Grammar = {
  "i want to read a novel by Milan Kundera on my kindle": {
    entities: {
      genre: "novel",
      author: "milan kundera",
      media: "e-book",
    },
  },
  "i want to read a Milan Kundera book": {
    entities: {
      author: "milan kundera",
    },
  },
  "i want to read a novel on my kindle": {
    entities: {
      genre: "novel",
      media: "e-book",
    },
  },
  "i want to read a novel" : {
    entities: {
      genre: "novel",
    },
  },
};

const getEntities = (entity:string, sentence: string) => {
  let u = sentence.toLowerCase().replace(/\.$/g, "");
  const words = u.split(' ')
  if (u in grammar) {
    if (entity in words)
    {
      return grammar[u].entities}
      else {
        return false
    }
  }
}

// if (sent in grammar) {
//   if ("genre" in grammar[sent].entities) {
//     console.log(grammar[sent].entities["genre"])
//     return true

const lower = (sentence : string) => {
  let u = sentence.toLowerCase().replace(/\.$/g, "");
  return u 
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
            initial: "Greeting",
            states: {
              Greeting: {
                entry: "speak.greeting",
                on: { SPEAK_COMPLETE: "HowCanIHelp" },
              },
              HowCanIHelp: {
                entry: say("What genre of book are you interested in reading today?"),
                on: { SPEAK_COMPLETE: "Ask" },
              },
              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: [
                    {
                    target: "SuggestBook",
                    guard: ({event}) => {
                      const sent = lower(event.value[0].utterance);
                      if (sent in grammar) {
                        if ("genre" in grammar[sent].entities && "author" in grammar[sent].entities && "media" in grammar[sent].entities) {
                          console.log(grammar[sent].entities["genre"])
                          return true
                        }
                      }
                      return false
                    },
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        bookGenre: ({event}) => {
                        const sentence = lower(event.value[0].utterance)
                        grammar[sentence].entities["genre"]}
                        //lastResult: ({ event }) => event.value,
                      }),
                    ],
                  },
                  { target: "askForAuthor",
                    guard: ({event}) => {
                      const sent = lower(event.value[0].utterance);
                      if (sent in grammar) {
                        if ("genre" in grammar[sent].entities && "media" in grammar[sent].entities) {
                          console.log(grammar[sent].entities["genre"])
                          return true
                        }
                      }
                      return false
                    },
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        bookGenre: ({event}) => {
                        const sentence = lower(event.value[0].utterance)
                        grammar[sentence].entities["genre"]}
                        //lastResult: ({ event }) => event.value,
                      }),
                    ],
                  },
                  {
                    target: "askForMedia",
                    guard: ({event}) => {
                      const sent = lower(event.value[0].utterance);
                      if (sent in grammar) {
                        if ("genre" in grammar[sent].entities && "author" in grammar[sent].entities) {
                          console.log(grammar[sent].entities["genre"])
                          return true
                        }
                      }
                      return false
                    },
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        bookGenre: ({event}) => {
                        const sentence = lower(event.value[0].utterance)
                        grammar[sentence].entities["genre"]}
                        //lastResult: ({ event }) => event.value,
                      }),
                    ],                 
                  }],
                },
              },              
              SuggestBook: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "I will give you the best recommendation when I am connected to a book API or ChatGPT" },
                  });
                },
                on: { SPEAK_COMPLETE: "Ask" },
              },
              IdleEnd: {},
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
    //
    actions: {
      prepare: ({ context }) =>
        context.spstRef.send({
          type: "PREPARE",
        }),
      // saveLastResult:
      "speak.greeting": ({ context }) => {
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Hello!" }, //I am here to help you find your next read! I can recommend you books based on your personal preferences." },
        });
      },
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
