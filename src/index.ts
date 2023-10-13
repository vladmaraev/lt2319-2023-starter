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
      [index: string]: string[];
        };
      }

const grammar = {
  entities: {
      colour: ["pink", "blue", "red", "yellow", "purple", "black", "white", "gray", "brown"],
      object: ["lamp", "book", "box", "bottle", "vase"],
      place: ["shelf", "table", "sofa", "bed"]
        },
      };

const sentenceIncludesWord = (word: string, sentence: string) => {
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
                    guard: ({ event }) => grammar.entities.colour(colourElement => event.value[0].utterance.includes(colourElement)) && grammar.entities.object(objectElement => event.value[0].utterance.includes(objectElement)) && grammar.entities.place(placeElement => event.value[0].utterance.includes(placeElement)),
                    actions: assign({ 
                      recognisedColour: ({ context, event }) => {
                      const colourElement = grammar.entities.colour.find(colour => event.value[0].utterance.includes(colour));
                      return colourElement;
                      },
                        recognisedObject: ({ context, event }) => {
                      const objectElement = grammar.entities.object.find(object => event.value[0].utterance.includes(object));
                      return objectElement;
                      },
                        recognisedplace: ({ context, event }) => {
                      const placeElement = grammar.entities.place.find(place => event.value[0].utterance.includes(place));
                      return placeElement;
                      },
                    }),
                  },
                  {
                    target: "NoColour",
                    guard: ({ event }) => !grammar.entities.colour(colourElement => event.value[0].utterance.includes(colourElement)),
                    actions: assign({
                      recognisedObject: ({ event }) => {
                        if (grammar.entities.object(objectElement => event.value[0].utterance.includes(objectElement))) {
                          const objectElement = grammar.entities.object.find(object => event.value[0].utterance.includes(object))
                          return objectElement
                        }
                      },
                        recognisedPlace: ({ event }) => {
                          if (grammar.entities.place(placeElement => event.value[0].utterance.includes(placeElement))) {
                            const placeElement = grammar.entities.place.find(place => event.value[0].utterance.includes(place))
                            return placeElement
                          }
                        },
                    }),
                  },
                  {
                    target: "NoObject",
                  guard: ({ event }) => !grammar.entities.object(objectElement => event.value[0].utterance.includes(objectElement)),
                  actions: assign({
                    recognisedColour: ({ event }) => {
                      if (grammar.entities.colour(colourElement => event.value[0].utterance.includes(colourElement))) {
                        const colourElement = grammar.entities.colour.find(colour => event.value[0].utterance.includes(colour))
                        return colourElement
                      }
                    },
                      recognisedPlace: ({ event }) => {
                        if (grammar.entities.place(placeElement => event.value[0].utterance.includes(placeElement))) {
                          const placeElement = grammar.entities.place.find(place => event.value[0].utterance.includes(place))
                          return placeElement
                        }
                      },
                  }),
                },
                {
                  target: "NoPlace",
                guard: ({ event }) => !grammar.entities.place(placeElement => event.value[0].utterance.includes(placeElement)),
                actions: assign({
                  recognisedColour: ({ event }) => {
                    if (grammar.entities.colour(colourElement => event.value[0].utterance.includes(colourElement))) {
                       const colourElement = grammar.entities.colour.find(colour => event.value[0].utterance.includes(colour))
                        return colourElement
                    }
                  },
                    recognisedObject: ({ event }) => {
                      if (grammar.entities.object(objectElement => event.value[0].utterance.includes(objectElement))) {
                          const objectElement = grammar.entities.object.find(object => event.value[0].utterance.includes(object))
                          return objectElement
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
            guard: ({ event, context }) => grammar.entities.colour(colourElement => event.value[0].utterance.includes(colourElement)) && (!!context.recogniedObject ||  grammar.entities.object(objectElement => event.value[0].utterance.includes(objectElement))) && (!!context.recognisedPlace || grammar.entities.place(placeElement => event.value[0].utterance.includes(placeElement))),
            actions: assign({ 
              recognisedColour: ({ context, event }) => {
                      const colourElement = grammar.entities.colour.find(colour => event.value[0].utterance.includes(colour));
                      return colourElement;
                      },
                recognisedObject: ({ event, context }) => {
                  if (context.recognisedObject) {
                    return context.recognisedObject;
                  } else if (grammar.entities.object(objectElement => event.value[0].utterance.includes(objectElement))) {
                    const objectElement = grammar.entities.object.find(object => event.value[0].utterance.includes(object));
                      return objectElement;
                  };
                },
                recognisedPlace: ({ event, context }) => {
                  if (context.recognisedPlace) {
                    return context.recognisedPlace;
                  } else if (grammar.entities.place(placeElement => event.value[0].utterance.includes(placeElement))) {
                    const placeElement = grammar.entities.place.find(place => event.value[0].utterance.includes(place));
                      return placeElement;
                  };
                },
            }),
          },
          {
          target: "#root.SlotObject.Prompt",
          guard: ({ event, context }) => grammar.entities.colour(colourElement => event.value[0].utterance.includes(colourElement)) && !context.recognisedObject && !grammar.entities.object(objectElement => event.value[0].utterance.includes(objectElement)),
          actions: assign({ 
            recognisedColour: ({ context, event }) => {
                      const colourElement = grammar.entities.colour.find(colour => event.value[0].utterance.includes(colour));
                      return colourElement;
                      },
          }),
        },
        {
          target: "#root.SlotPlace.Prompt",
          guard: ({ event, context }) => grammar.entities.colour(colourElement => event.value[0].utterance.includes(colourElement)) && !context.recognisedPlace,
          actions: assign({ 
            recognisedColour: ({ context, event }) => {
                      const colourElement = grammar.entities.colour.find(colour => event.value[0].utterance.includes(colour));
                      return colourElement;
                      },
              recognisedObject: ({ event, context }) => {
                if (context.recognisedObject) {
                  return context.recognisedObject;
                } else if (grammar.entities.object(objectElement => event.value[0].utterance.includes(objectElement))) {
                    const objectElement = grammar.entities.object.find(object => event.value[0].utterance.includes(object));
                      return objectElement;
                };
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
        guard: ({ event, context }) => grammar.entities.object(objectElement => event.value[0].utterance.includes(objectElement)) && !!context.recognisedColour && (!!context.recognisedPlace || grammar.entities.place(placeElement => event.value[0].utterance.includes(placeElement))), 
        actions: assign({
          recognisedObject: ({ context, event }) => {
                      const objectElement = grammar.entities.object.find(object => event.value[0].utterance.includes(object));
                      return objectElement;
                      },
          recognisedPlace: ({ event, context }) => {
            if (context.recognisedPlace) {
              return context.recognisedPlace;
            } else if (grammar.entities.place(placeElement => event.value[0].utterance.includes(placeElement))) {
                    const placeElement = grammar.entities.place.find(place => event.value[0].utterance.includes(place));
                      return placeElement;
            };
            }
        }),
      },
      {
        target: "#root.SlotPlace.Prompt",
      guard: ({ event }) => grammar.entities.object(objectElement => event.value[0].utterance.includes(objectElement)) && !grammar.entities.place(placeElement => event.value[0].utterance.includes(placeElement)), 
      actions: assign({
        recognisedObject: ({ context, event }) => {
                      const objectElement = grammar.entities.object.find(object => event.value[0].utterance.includes(object));
                      return objectElement;
                      },
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
      guard: ({ event, context }) => grammar.entities.object(objectElement => event.value[0].utterance.includes(objectElement)) && !!context.recognisedColour && !!context.recognisedObject,
      actions: assign({
        recognisedPlace: ({ context, event }) => {
                      const placeElement = grammar.entities.place.find(place => event.value[0].utterance.includes(place));
                      return placeElement;
                      },
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
