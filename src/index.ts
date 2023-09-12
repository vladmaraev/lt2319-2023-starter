import { createMachine, createActor, assign } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "eedf2f3616c748c99f0d3266a102a6ba",
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  locale: "en-US",
  asrDefaultNoInputTimeout: 5000,
  ttsDefaultVoice: "en-US-JennyNeural",
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
  "put the red book on the table": {
    entities: {
      color: "red",
      object: "book",
      place: "table",
        },
      },
  "I have a book":{
    entities: {
      object: "book",
    },
  },
};

const ToLowerCase = (object: string) => {
 return object.toLowerCase().replace(/\.$/g, "");
  }
  
// machine
const dmMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QCcD2qAuA6AIgSwEMAbVKAVzAFkCA7AmZLABWTAAcDWBiAQQGUASgBUhfAPoCAojxwBNANoAGALqJQbVLDwY8qGmpAAPRACYAzIqwBOAKxmAjCYAc9xQBZnAdkVmANCABPRHtPNyxFCIiQkxMbRQA2JwBfJP80TFxCEnIqWnowRgAhTAALADE8ZFgMHhoIPjAAYz0ILAqq7BZUAFs2DC4+JmkAaTEAYQB5SiYAGUkhSSVVJBANLR09A2MEMxsncPjY93crRUd4+P8ghEPLOKi3eKszDwuUtPRsfGJSCmo6BhYYoYcqVaq1epNFptMHYHiwADWXCkkwA4gA5ACSfEkOCWBjW2l0+hW2089niWHiZxsFxMoQpDiuiBsVkpNnMj0SniccU8nneIHSXyyv1yAIKQNK7XBdQazTqWHl0K6vX6gxG4yms3mixUBM0RM2pMQu32CViFLcPIi8T8gUQTicZnCkU8ZniITMnlpguFmR+OX++SK0thEOVisjrXhCPsyMkaKxOLx+pWhI2JNAZPs+2p9lZihMCSdduZCCcnvCnLZVns9lsnhMfs+WFRAFVMcx8jNUAQIJAuGMZpixsN8enDZmtqYrJ4sJWmxEzCvzGYrG5y-XYtWXuubG4bHsnFYWxkO12eI0dAA3MBYTEQIhgLgicR8IQ8YS4ifqKfEmcdkcBc3G9VlnScRRng3Lc53sLAjysKwnE8OdINsM9sAvLAr1ve9H2fXhBDED8vwWVNlj-dYAJNICTBAsDkLMdD103B0EFzC5wlZOdkNLI9klSIVW2w3C8DvJU2DAAgETwGgoAGIYeFGSZpjmBZf1Wf9jWzU1gKcUCfSYliYPYhsTHgxQeO9DwkMOGxMLbTscOvcT7xmPBqjAGg5IUlEJgxbEfzTKijSzIxTTsLA3CsGJ63iNxErcCktxcGwEJ4kxnjcKzzGbIT-WwzE6Fcu8iOEUQJGkORNIzGjdIQZwXXiVCnh9PKbHsUCt0PdLrXiI9yRXNxIPiFIhJoVAB3gFZhQNaidIihAAFpD3LZaTDcRzvmyP48gYeawsA+1rjtBDIgiXkNw3d1ttFIN9slFh2E4MBDunWimy3TrXUiEJc2Qm67sDPaJVDEEZRqOUoTqd76qWzryw8eD7giWkBtAxRPDGgrWx2sVg0BYFQQ6CMYdaSG4cW7YkPLOIrF+20ORi2ID2B3bxRDKUIfDaGFQp2FmDQNUqfC7Yus8Om2XOt1mMS4szHZgnHvBknZUhfmYQ6HDEVFwDBqpEbDysvi2ql9kLvdAyPB8JWHrB7m1ahjXoUhtoyCIIgxFqWAAHcCj12iUPnOxTmpKDNsUXlzZliIrfl23cYyfH7a54nIbJzW3YIsBJFhycFrF4JkOiyDrTiZ0+XMctvHoi6Rs9HkPC2pORRBzmibDUm+ehaNA4a2n2P5ejUZi423Tt0G0679XoyVcmhZ6Pp+6WiXy0rSwLriCxrrZ1uAw5wnJXT3mXajBfY3sFftkQw2DMOVxYiQk7HWpRmfQpUInFiSeO+PmfnZzznkwTgOhiDexoH7AOBcjpB35AhdcCQIixRygZdeb9LadRaiNH++8LzX1MPYLcPgQ6RDrAeLKIQHJ4OciAmAvZ+yQAIQgL6ZlHDpQullbGoQfSCQ+OeZyYk7zMKeFuJc1hsbUgsJtWIfDhICMvKVfCT43owI+g1eskszIuHnN4Oy9lbIjUcqJJRklpKyXkswzqYRbLeAPIcRIoizJ1hdHOAa38cHmAMsYwRpiPJeR8pYtR8Mb5dWilwqyjwTCOKsKlKO0VJE5USFjAaPiuzFQIEo5hKEepmHov1WkIRTjOhxikIAA */
    id: "root",
    type: "parallel",
    states: {
      DialogueManager: {
        initial: "Prepare",
        states: {
          Prepare: {
          on: { ASRTTS_READY: "#BothFirstAndSecond"},
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

          BothFirstAndSecond: {
            id: "BothFirstAndSecond",
            type: "parallel",
            states: {
              First: {
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
                        target: "#Full_Answer",
                        guard: ({ event }) =>
                          !!(
                            grammar[ToLowerCase(event.value[0].utterance)] || {}
                          ).entities.color &&
                          !!(
                            grammar[ToLowerCase(event.value[0].utterance)] || {}
                          ).entities.object &&
                          !!(
                            grammar[ToLowerCase(event.value[0].utterance)] || {}
                          ).entities.place,
                        actions: assign({
                          Color: ({ event }) =>
                            (
                              grammar[
                                ToLowerCase(event.value[0].utterance)
                              ] || {}
                            ).entities.color,
                          Object: ({ event }) =>
                            (
                              grammar[
                                ToLowerCase(event.value[0].utterance)
                              ] || {}
                            ).entities.object,
                          Place: ({ event }) =>
                            (
                              grammar[
                                ToLowerCase(event.value[0].utterance)
                              ] || {}
                            ).entities.place,
                        }),
                      },
                    },
                  },
                  Full_Answer: {
                    id: "Full_Answer",
                    entry: ({ context }) => {
                      context.spstRef.send({
                        type: "SPEAK",
                        value: {
                          utterance: `OK, I put the ${context.Color} ${context.Object} on the ${context.Place}`,
                        },
                        on: { SPEAK_COMPLETE: "#IdleEnd" },
                      });
                    },
                  },
                  IdleEnd: {
                    id: "IdleEnd",
                  },
                },
              },
              Second: {
                initial: "Prompt",
                states: {
                  Prompt: {
                    entry: "speak.prompt",
                    on: { SPEAK_COMPLETE: "Ask1" },
                  },
                  Ask1: {
                    entry: listen(),
                    on: {
                      RECOGNISED: {
                        target: "Partial_Answer",
                        guard: ({ event }) =>
                          !!(
                            grammar[ToLowerCase(event.value[0].utterance)] || {}
                          ).entities.object,
                        actions: assign({
                          Object: ({ event }) =>
                            (
                              grammar[
                                ToLowerCase(event.value[0].utterance)
                              ] || {}
                            ).entities.object,
                        }),
                      },
                    },
                  },
                  Partial_Answer: {
                    id: "Partial_Answer",
                    entry: ({ context }) => {
                      context.spstRef.send({
                        type: "SPEAK",
                        value: {
                          utterance: `OK, I have a ${context.object}. What color is it and what would you like me to do with it?`,
                        },
                        on: { SPEAK_COMPLETE: "#IdleEnd" },
                      });
                    },
                  },
                },
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

            on: {
              CLICK: { target: "Inactive", actions: "prepare" }
            }
          },

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

          Inactive: { entry: "gui.Inactive", on: {
            ASRTTS_READY: "Active"
          } }
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
          value: { utterance: "Hi! What would you like to do?" },
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