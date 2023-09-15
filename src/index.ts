import { createMachine, createActor, assign, raise } from "xstate";
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
    entities: {
      [index: string]: string;
        };
      }

const grammar = {
  entities: {
      colour: "pink",
      object: "lamp",
      place: "shelf",
        },
      };

const modify = (word: string, sentence: string) => {
  console.log(word, sentence.toLowerCase().replace(/\.$/g, "").split(/\s+/))
if (sentence.toLowerCase().replace(/\.$/g, "").split(/\s+/).includes(word)) {
  return true}
  else {
    return false
  }
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
                  RECOGNISED: [{
                    target: "All",
                    guard: ({ event }) => modify(grammar.entities.colour, event.value[0].utterance) && modify(grammar.entities.object, event.value[0].utterance) && modify(grammar.entities.place, event.value[0].utterance),
                    actions: assign({ 
                      recognisedColour: ({ context }) =>
                        (grammar.entities.colour),
                        recognisedObject: ({ context }) =>
                        (grammar.entities.object),
                        recognisedPlace: ({ context }) =>
                        (grammar.entities.place),
                    }),
                  },
                  {
                    target: "NoColour",
                    guard: ({ event }) => !modify(grammar.entities.colour, event.value[0].utterance),
                    actions: assign({
                      recognisedObject: ({ event }) => {
                        if (modify(grammar.entities.object, event.value[0].utterance)) {
                          return grammar.entities.object;
                        } else {
                            {}
                        }
                      },
                        recognisedPlace: ({ event }) => {
                          if (modify(grammar.entities.place, event.value[0].utterance)) {
                            return grammar.entities.place;
                          } else {
                            {}
                          }
                        },
                    }),
                  },
                  {
                    target: "NoObject",
                  guard: ({ event }) => !modify(grammar.entities.object, event.value[0].utterance),
                  actions: assign({
                    recognisedColour: ({ event }) => {
                      if (modify(grammar.entities.colour, event.value[0].utterance)) {
                        return grammar.entities.colour;
                      } else {
                        {}
                      }
                    },
                      recognisedPlace: ({ event }) => {
                        if (modify(grammar.entities.place, event.value[0].utterance)) {
                          return grammar.entities.place;
                        } else {
                          {}
                        }
                      },
                  }),
                },
                {
                  target: "NoPlace",
                guard: ({ event }) => !modify(grammar.entities.place, event.value[0].utterance),
                actions: assign({
                  recognisedColour: ({ event }) => {
                    if (modify(grammar.entities.colour, event.value[0].utterance)) {
                      return grammar.entities.colour;
                    } else {
                      {}
                    }
                  },
                    recognisedObject: ({ event }) => {
                      if (modify(grammar.entities.object, event.value[0].utterance)) {
                        return grammar.entities.object;
                      } else {
                        {}
                      }
                    },
                }),
              },
                ],
                },
              },
              All: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `OK, I put the ${context.recognisedColour} ${context.recognisedObject} on the ${context.recognisedPlace}` },
                  });
                },
              },
              NoColour: { entry: raise({ type: "FILL_COLOUR" }) },
              NoObject: { entry: raise({ type: "FILL_OBJECT" }) },
              NoPlace: { entry: raise({ type: "FILL_PLACE" }) },
              IdleEnd: {},
            },
          },
        },
      },
      SlotColour: {
        initial: "Idle",
        states: {
          Idle: { on: { FILL_COLOUR: "Prompt" } },
          Prompt: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `Tell me the colour`},
              });
            },
            on: { SPEAK_COMPLETE: "Ask" },
          },
          Ask: {
            entry: listen(),
            on: { RECOGNISED: [{
              target: "#root.DialogueManager.Form.All",
            guard: ({ event, context }) => modify(grammar.entities.colour, event.value[0].utterance) && !!context.recognisedObject && modify(grammar.entities.place, event.value[0].utterance),
            actions: assign({ 
              recognisedColour: ({ context }) =>
                (grammar.entities.colour),
                recognisedPlace: ({ event }) => {
                  if (modify(grammar.entities.place, event.value[0].utterance)) {
                    return grammar.entities.place;
                  } else {
                    {}
                  }
                },
            }),
          },
          {
          target: "#root.SlotObject.Prompt",
          guard: ({ event, context }) => modify(grammar.entities.colour, event.value[0].utterance) && !context.recognisedObject,
          actions: assign({ 
            recognisedColour: ({ context }) =>
              (grammar.entities.colour),
          }),
        },
        {
          target: "#root.SlotPlace.Prompt",
          guard: ({ event, context }) => modify(grammar.entities.colour, event.value[0].utterance) && !context.recognisedPlace,
          actions: assign({ 
            recognisedColour: ({ context }) =>
              (grammar.entities.colour),
              recognisedObject: ({ event }) => {
                if (modify(grammar.entities.object, event.value[0].utterance)) {
                  return grammar.entities.object;
                } else {
                  {}
                }
              },
          }),
        },
        ],
        },
      },
    },
  },
  SlotObject: {
    initial: "Idle",
    states: {
      Idle: { on: { FILL_OBJECT: "Prompt" } },
      Prompt: {
        entry: ({ context }) => {
          context.spstRef.send({
            type: "SPEAK",
            value: { utterance: `What is the object?`},
          });
        },
        on: { SPEAK_COMPLETE: "Ask" },
      },
      Ask: {
        entry: listen(),
        on: { RECOGNISED: [{
          target: "#root.DialogueManager.Form.All",
        guard: ({ event, context }) => modify(grammar.entities.object, event.value[0].utterance) && !!context.recognisedColour && (!!context.recognisedPlace || modify(grammar.entities.place, event.value[0].utterance)), 
        actions: assign({
          recognisedObject: ({ context }) => grammar.entities.object,
          recognisedPlace: ({ event }) => {
            if (modify(grammar.entities.place, event.value[0].utterance)) {
              return grammar.entities.place;
            } else {
             {}
            };
            }
        }),
      },
      {
        target: "#root.SlotPlace.Prompt",
      guard: ({ event, context }) => modify(grammar.entities.object, event.value[0].utterance) && !modify(grammar.entities.place, event.value[0].utterance), 
      actions: assign({
        recognisedObject: ({ context }) => grammar.entities.object,
      }),
    },
    ],
    },
  },
},
},
SlotPlace: {
  initial: "Idle",
  states: {
    Idle: { on: { FILL_PLACE: "Prompt" } },
    Prompt: {
      entry: ({ context }) => {
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: `Where should I put the ${context.recognisedColour} ${context.recognisedObject}?`},
        });
      },
      on: { SPEAK_COMPLETE: "Ask" },
    },
    Ask: {
      entry: listen(),
      on: { RECOGNISED: {
        target: "#root.DialogueManager.Form.All",
      guard: ({ event, context }) => modify(grammar.entities.place, event.value[0].utterance) && !!context.recognisedColour && !!context.recognisedObject,
      actions: assign({
        recognisedPlace: ({ context }) => grammar.entities.place,
      }),
    },
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
