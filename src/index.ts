import { createMachine, createActor, assign } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "d281bc32d54f4bc090c53f113593a2a6",
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
      };
    }

const grammar = {
  "put the pink lamp on the shelf": {
    entities: {
      colour: "pink",
      object: "lamp",
      place: "shelf",
        },
      },
};

const getEntity = (context: DMContext, entity: string): string | false => {
 if (context.lastResult[0].utterance.length > 0) {
    const u = context.lastResult[0].utterance.toLowerCase().replace(/\.$/g, "");
    if (u in grammar) {
      if (entity in grammar[u].entities) {
        return grammar[u].entities[entity];
      }
    }
  }
  return false;
};

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
            on: { ASRTTS_READY: "Form" },
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
          Form: {
            initial: "Prompt",
            states: {
              Prompt: {
                entry: "speak.prompt",
                on: { SPEAK_COMPLETE: "Ask" },
              },
              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "ColourSlot",
                    guard: ({ context }) => !!getEntity(context, "colour"),
                    actions: [
                      assign({
                        colour: ({ context }) => getEntity(context, "colour"),
                      }),
                    ],
                  },
                },
              },
              ColourSlot: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: `OK, so ${context.colour}`,
                  });
                },
                on: { SPEAK_COMPLETE: "Prompt" },
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
      "speak.prompt": ({ context }) => {
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Hi! What is your request?" },
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
