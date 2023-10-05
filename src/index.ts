import { createMachine, createActor, assign, raise, fromPromise } from "xstate";
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
      entities: {
        origin: ["stockholm", "tokyo", "oslo", "berlin", "warsaw","rome", "sydney","seoul","barcelona","prague","copenhagen"].map(origin => origin.toLowerCase()), 
        destination: ["helsinki", "paris", "cairo","berlin", "tallinn", "riga", "vilnius", "london", "chicago", "beijing","brisbane","perth","adelaide", "washington","osaka","melbourne"].map(destination => destination.toLowerCase()), 
        day: ["monday","tuesday","wednesday", "thursday", "friday", "saturday", "sunday"].map(day => day.toLowerCase()), 
      },
    };
    
    
    
    const ToLowerCase = (word: any, sentence: string) => {
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
    /** @xstate-layout N4IgpgJg5mDOIC5QCcD2qAuA6AIgSwEMAbVKAVzAFkCA7AmZLABWTAAcDWBiAQQGUASgBUhfAPoCAojxwBNANoAGALqJQbVLDwY8qGmpAAPRACYArADZFWMwBYA7IrOKrATjMBGAMwAaEAE9EWwsPLAcLS1dFAA4TOI87AF9EvzRMXEIScipaejBGPgxObBZUAFs2DC4+JmkAaTEAYQB5SiYAGUkhSSVVJBANLR09A2MEEwt7eywIixNXCZjorxN7P0CEDxNo6y9LEy9FLy9XWxNk1PRsfGJSCmo6BixC4qweWABrLikWgHEAOQAknxJDhegZBtpdPp+mNDrZolgPO49iFlmcLBZ1ogPC4vFhXPYImZXFZDi4zBcQGlrpk7jlHvlnkVkNh3l8fs0AcDQfIPH11JooSNYYh4YjkWZUR50RMsQEcRMzAT5hZonYFjsPLYqTSMrdsg88gUWWzPt9JH8gSCwSYBQMhcMYaA4YoEUiUZYZV4MfKNh4PFYwqrorZnBTzLqrvqsvdck8Xqy3ubOdybfIvPbIU7RmK3RLPWifXLsZsvPZQmdSdELAjbO4o+lmsg8FA8DQxC8MGAsICcJ0uAAxQHtdpiZoCQG-QH-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 */
    id: "root",
    type: "parallel",
    states: {
      DialogueManager: {
        initial: "Prepare",
        states: {
          Prepare: {
          on: { ASRTTS_READY: "Start"},
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
          Start:{
            initial: "Prompt",
            states: {
              Prompt: {
                entry: "speak.prompt",
                on: { SPEAK_COMPLETE: "Ask"},
              },
              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: [
                    {
                      target: "FULL_ANSWER",
                      guard: ({ event, context }) => {
                        const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                        return grammar.entities.origin.some(origin =>
                          ToLowerCase(origin, lowercasedUserInput)) && grammar.entities.destination.some(destination =>
                            ToLowerCase(destination, lowercasedUserInput)) && grammar.entities.day.some(day =>
                              ToLowerCase(day, lowercasedUserInput))
                      },
                      actions: assign({ 
                        Origin: ({ context, event }) => {
                          const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                          const matchingOrigin = grammar.entities.origin.find(origin =>
                            ToLowerCase(origin, lowercasedUserInput)
                          );
                          return matchingOrigin || null;
                        },
                        Destination: ({ context, event }) => {
                          const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                          const matchingDestination = grammar.entities.destination.find(destination =>
                            ToLowerCase(destination, lowercasedUserInput)
                          );
                          return matchingDestination || null;
                        },
                        Day: ({ context, event }) => {
                          const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                          const matchingDay = grammar.entities.day.find(day =>
                            ToLowerCase(day, lowercasedUserInput)
                          );
                          return matchingDay || null;
                        },
                      }),
                    },
                    {
                      target: "Origin",
                      guard: ({ event, context }) => {
                        const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                        return grammar.entities.destination.some(destination =>
                          ToLowerCase(destination, lowercasedUserInput)
                        ) && !context.Origin;
                      },
                      actions: assign({
                        Destination: ({ context, event }) => {
                          const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                          const matchingDestination = grammar.entities.destination.find(destination =>
                            ToLowerCase(destination, lowercasedUserInput)
                          );
                          return matchingDestination || null;
                        },
                        Day: ({ context, event }) => {
                          const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                          const matchingDay = grammar.entities.destination.find(day =>
                            ToLowerCase(day, lowercasedUserInput)
                          );
                          return matchingDay || null;
                        },
                      }),
                    },  //done
                    {
                      target: "Destination",
                      guard: ({ event,context }) => {
                        const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                        return grammar.entities.origin.some(origin => 
                          ToLowerCase(origin, lowercasedUserInput)
                        ) && !context.Destination;
                      },
                      actions: assign({
                        Origin: ({ event}) => {
                          const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                          const matchingOrigin = grammar.entities.origin.find(origin =>
                            ToLowerCase(origin, lowercasedUserInput) 
                          );
                          return matchingOrigin || null;
                        },
                        Day: ({ event}) => {
                          const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                          const matchingDay = grammar.entities.day.find(day =>
                            ToLowerCase(day, lowercasedUserInput) 
                          );
                          return matchingDay || null;
                        },
                      }),
                    }, // done
                    {
                      target: "Day",
                      guard: ({ event, context}) => {
                        const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                        return grammar.entities.origin.some(origin => 
                          ToLowerCase(origin, lowercasedUserInput)) && grammar.entities.destination.some(destination =>
                            ToLowerCase(destination, lowercasedUserInput)) && !context.Day;
                      },
                      actions: assign({
                        Origin: ({ context, event }) => {
                          const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                          const matchingOrigin = grammar.entities.origin.find(origin =>
                            ToLowerCase(origin, lowercasedUserInput)
                          );
                          return matchingOrigin || null;
                        },
                        Destination: ({ context, event }) => {
                          const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                          const matchingDestination = grammar.entities.destination.find(destination =>
                            ToLowerCase(destination, lowercasedUserInput)
                          );
                          return matchingDestination || null;
                        },
                      }),
                    }, //done
                  ],
                },
              },
              FULL_ANSWER: {
                id: "FULL_ANSWER",
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {utterance: `Okay, I will book the tickets from  ${context.Origin} to ${context.Destination} for the upcoming ${context.Day}.`},
                  });
                },
              },
              Origin: { entry: raise({type: "FILL_ORIGIN"})},
              Destination: { entry: raise({type: "FILL_DESTINATION"})},
              Day: { entry: raise({type: "FILL_DAY"})},
            },
          },
        },
      },
      Origin_State: {
        initial: "IDLE",
        states: {
          IDLE: { on: { FILL_ORIGIN: "Origin_Start"}},
          Origin_Start: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: {utterance: `What city would you like to fly from to ${context.Destination}?`},
              });
            },
            on: { SPEAK_COMPLETE: "Ask"},
          }, //done
          Ask: {
            entry: listen(),
            on: {
              RECOGNISED: [
                {
                  target: "#root.DialogueManager.Start.FULL_ANSWER",
                  guard: ({ event, context }) => {
                    const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                    return grammar.entities.origin.some(origin => 
                      ToLowerCase(origin, lowercasedUserInput)) && grammar.entities.day.some(day=>
                        ToLowerCase(day, lowercasedUserInput))
                  },
                  actions: assign({
                    Day: ({ context, event }) => {
                      const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                      const matchingDay = grammar.entities.day.find(day =>
                        ToLowerCase(day, lowercasedUserInput)
                      );
                      return matchingDay || null;
                    },
                    Origin: ({ context, event }) => {
                      const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                      const matchingOrigin = grammar.entities.origin.find(origin =>
                        ToLowerCase(origin, lowercasedUserInput)
                      );
                      return matchingOrigin || null;
                    },
                  }),
                }, // done
                {
                  target: "Ask_For_The_Day",
                  guard: ({ event, context }) => {
                    const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                    return grammar.entities.origin.some(origin =>
                      ToLowerCase(origin, lowercasedUserInput)
                    )
                  },
                  actions: assign({
                    Origin: ({ context, event }) => {
                      const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                      const matchingOrigin = grammar.entities.origin.find(origin =>
                        ToLowerCase(origin, lowercasedUserInput)
                      );
                      return matchingOrigin || null;
                    },
                  }),
                }, // done
                
              ],
            },
          }, // done
          Ask_For_The_Day: {
            entry: ({ context}) => {
              context.spstRef.send({
                type: "SPEAK",
                value: {utterance: `On what day would you like to fly from ${context.Origin}?`},
              });
            },
            on: { SPEAK_COMPLETE: "Ask_1"},
          }, // done
          Ask_1: {
            entry: listen(),
            on: {
              RECOGNISED: [
                {
                  target: "#Full_Answer_Origin_State",
                  guard: ({ event, context }) => {
                    const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                    return grammar.entities.day.some(day =>
                      ToLowerCase(day, lowercasedUserInput)
                    )
                  },
                  actions: assign({
                    Day: ({ context, event }) => {
                      const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                      const matchingDay = grammar.entities.day.find(day =>
                        ToLowerCase(day, lowercasedUserInput)
                      );
                      return matchingDay || null;
                    },
                  }),
                },
              ],
            },
          }, //done
          Full_Answer_Origin_State: {
            id: "Full_Answer_Origin_State",
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: {utterance: `Okay, I will book the tickets from  ${context.Origin} to ${context.Destination} on the upcoming ${context.Day}.`},
              });
            },
          }, // done
        },
      }, // done
      Destination_State: {
        initial: "IDLE",
        states: {
          IDLE: { on: { FILL_DESTINATION: "Destination_Start"}},
          Destination_Start: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: {utterance: `What city would you like to fly to?`},
              });
            },
            on: { SPEAK_COMPLETE: "Ask"},
          }, //done
          Ask: {
            entry: listen(),
            on: {
              RECOGNISED: [
                {
                  target: "Ask_For_The_Day",
                  guard: ({ event, context}) => {
                    const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                    return grammar.entities.destination.some(destination =>
                      ToLowerCase(destination, lowercasedUserInput)
                    ) && !context.Day;
                  },
                  actions:
                  assign({
                    Destination: ({ context, event }) => {
                      const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                      const matchingDestination = grammar.entities.destination.find(destination =>
                        ToLowerCase(destination, lowercasedUserInput)
                      );
                      return matchingDestination || null;
                    },
                  }),
                },
                {
                  target: "#root.DialogueManager.Start.FULL_ANSWER",
                  guard: ({ event, context}) => {
                    const lowercaseUserInput = event.value[0].utterance.ToLowerCase();
                    return grammar.entities.destination.some(destination =>
                      ToLowerCase(destination, lowercaseUserInput)) && grammar.entities.day.some(day =>
                        ToLowerCase(day, lowercaseUserInput)) 
                  },
                  actions: assign({
                    Destination: ({ context, event}) => {
                      const lowercaseUserInput = event.value[0].utterance.ToLowerCase();
                      const matchingDestination = grammar.entities.destination.find(destination =>
                        ToLowerCase(destination, lowercaseUserInput)
                      );
                      return matchingDestination || null;
                    },
                    Day: ({ context, event }) => {
                      const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                      const matchingDay = grammar.entities.day.find(day =>
                        ToLowerCase(day, lowercasedUserInput)
                      );
                      return matchingDay || null;
                    },
                  }),
                },
              ],
            },
          }, //done
          Ask_For_The_Day: {
            entry: ({ context}) => {
              context.spstRef.send({
                type: "SPEAK",
                value: {utterance: `On what day would you like to fly to ${context.Destination}?`},
              });
            },
            on: { SPEAK_COMPLETE: "Ask_1"},
          }, //done
          Ask_1: {
            entry: listen(),
            on: {
              RECOGNISED: [
                {
                  target: "Full_Answer_Destination_State",
                  guard: ({ event, context}) => {
                    const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                    return grammar.entities.day.some(day =>
                      ToLowerCase(day, lowercasedUserInput)
                    ) 
                  },
                  actions: assign({

                    Day: ({ context, event }) => {
                      const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                      const matchingDay = grammar.entities.day.find(day =>
                        ToLowerCase(day, lowercasedUserInput)
                      );
                      return matchingDay || null;
                    },
                  }),
                },
              ],
            },
          }, //done
          Full_Answer_Destination_State: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: {utterance: `Okay, I will book the tickets from  ${context.Origin}  to ${context.Destination} for the upcoming ${context.Day}.`},
              });
            },
          }, //done
        },
      }, //done
      Day_State: {
        initial: "IDLE",
        states: {
          IDLE: { on: { FILL_DAY: "Day_Start"}},
          Day_Start: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: {utterance: `I hear ya. On what day would you like to fly from ${context.Origin} to ${context.Destination}?`},
              });
            },
            on: { SPEAK_COMPLETE: "Ask"},
          }, // done
          Ask: {
            entry: listen(),
            on: {
              RECOGNISED: 
                {
                  target: "Full_Answer_Day_State",
                  guard: ({ event, context }) => {
                    const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                    return grammar.entities.day.some(day =>
                      ToLowerCase(day, lowercasedUserInput)
                    ) 
                  },
                  actions: assign({
                    Day: ({ context, event }) => {
                      const lowercasedUserInput = event.value[0].utterance.toLowerCase();
                      const matchingDay = grammar.entities.day.find(day =>
                        ToLowerCase(day, lowercasedUserInput)
                      );
                      return matchingDay || null;
                    },
                  }),
                },  
            },
          }, // done
          Full_Answer_Day_State: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: {utterance: `Okay, I will book the tickets from ${context.Origin} to ${context.Destination} for the upcoming ${context.Day}.`},
              });
            },
          }, // done 
        },
      }, // done

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
          value: { utterance: "Hi! I'm a virtual plane ticket booking assistant. If you wish me to book a trip for you then just provide me with the departure city, desired destination, and on which day you would like to fly! " },
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
