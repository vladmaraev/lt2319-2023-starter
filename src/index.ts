import { createMachine, createActor, assign, raise, fromPromise } from "xstate";
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
      entities: {
          origin: "stockholm",
          destination: "helsinki",
          day: "wednesday",
            },
          };
    
    const ToLowerCase = (word: string, sentence: string) => {
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
    /** @xstate-layout N4IgpgJg5mDOIC5QCcD2qAuA6AIgSwEMAbVKAVzAFkCA7AmZLABWTAAcDWBiAQQGUASgBUhfAPoCAojxwBNANoAGALqJQbVLDwY8qGmpAAPRACYAbAGYzWAOwAWAKyKzimxYsBOByYA0IAJ6IdmYOWBZONi4eAIzRDh72AL6JfmiYuIQk5FS09GCMfBic2CyoALZsGFx8TNIA0mIAwgDylEwAMpJCkkqqSCAaWjp6BsYIJjYOoTZxFgAcXrF2dnN+gQjRJh4WWIpb9h6WDmYmc8mp6Nj4xKQU1HQMWIXFWDywANZcUi0A4gByAEk+JIcL0DINtLp9P0xhZohYbFhvPNgh4TPELHYLGtENFXIpdiFFNE7HibOj5ucQGkrplbjkHvknkVkNg3p9vs1-kCQfJon11JpISMYYg4QikSYUWY0RisTiNhM5rs5jYYns1fFtlSaRkbtl7nkCiy2R8vpJfoDgaCTAKBkLhtDQLD4YjkXNUejtvKArjojKkZjMXj4V4zilqZc9Vk7rlHs9Wa8zZzudb5BY7RDHaMxa7JdLZd7sb6NvNrGZSXZNY4THZnDqo81kHgoHgaGJnhgwFgAThOlwAGIA9rtMTNAQAn4Av5g-pZqE5jYuLAeObE1Xebx11cKmyKZUnTbhfekxR2EwN9JNlttjtFLtYa+t9sJqo1epNVodLo9FTgh0LqKCArASapSh4ywhFi567vuWCHlKTgeni56XtgT63p23bsualo8qCf5zgBIrOqYJLRFgWyYssdZzBYijhAqcxxJRHirniJinE4cJoY+zbPneBAPjhKZWry-L-kMgGkQgczePBijOGxyJqiECpmHuhIOHEJwJLRZi8RhL73thHxiAOqDIGIQgABZgGIOAEP41S1DwDQtG0nTdLOgpSSRRi4hYnFYMxa7UZYJxyep2whSc9FmKqcIVoZ-GYSZSbvGI0S4VyYkEZmxFOgFS4QfB5juF4JjRGx+7qZpzjacc+z6bxOBwDodCOoJD69v2Q4jg5kh8EI048CNzQzoRvnCkVYz+gSq7rpM6K1ooO4ltECxIquEwTDY5K1q17VtkJULdd2bWwB1p16IJrIuR+Hnft5U32n5s2IFMdhYFWCIOKqpIJbECqbR421zLt+0HXYR1XSdXVYRlOWpryr3zv5YxotYpwmM48yKWe7gg9puznptmwQZtwSw9dCPpSJFq5fhfIFe9i5VfEWDwt4Lh7hWjElls2ORHR3grWq9YRrql202diPsuZlnWXZDlOQ9bmfp5P4+W9M2LhTYNwlVcyqgklhniD9ghZ47ibTKEGKRYNPw3L9NmdlonM2jhX6xpFGbGe2xyVqEzExRZ7GxTpIegZUtRo5-jnT2faSIOw6jjgPAKN7bNAfNK5rpty1bmtqwlis31yfu1UInE3iSxc6QJ0nzevur7lfl5v6s3rQGOGD0Rql4jiYpqNgKhXIVITXMxTLjseN1cTlJwzeFpjnvcyXRC0m16GJxGqE9mOHDhWAlY+HAvkbpD8ACqALMHk7SoAQECQFwjTtACjR1Dr6MfQgeioQqpeEOBXM8dgFSLV2JEBwkQVhElXLxO+D8eAAGMdAADduwAggEQMAXARDiGGjwYQqMe7ZiAnCZUUoQwaUUNpTYIM6KImWJtTwHg9hBQSsg++rwMF4GwT2PBBD+ACA7EIUh3R8qSU3sVahlE4TEnoYw3wG1yTKhNsxCCjg5hxSdnHG+fD0FYO7HwNgYACDvDbFAdumtnrd1kZQmSCjaHKL3Koy2ckkRmASpwoK2kvAGMXlgFB-DTFYHaHgK6YAaA2ORnlP+PsqHLltv6KYGk6yWEgRtDSiJiRBWWCbEkMRwwhLCQCOgAjsG8EEEQiQ0g5BJNzjJU4YNVyXyavECGkwQZwm+vMTc8JzAOGSBGGgqA37wH6DSJx0lioAFpQ4liWd9Am6yNmKRsK1OkBo4z5DmRjUw55K5bHmocJS0QFThDWUsLU1UFgmx2fqWMjJGAsHYJwMAhyAG1nJCFM5UQXAyiueXUkSIlgLB0gicIV9pa7NeUaZkxQfnsxWGDCGMQgWXKgZzeEwQ9gMMOBDOF8cEUMiRa+ZgaAKgYFRUBCkiJMXnOBTEEG5gB6cKrDYE2Z4I7PJjBS+MJoMr0taYcHYvMIKz3MBo9lAZqpnn2ryusqFDG0heUKpkVKBy3wGjwP4fAADqkgBBivkViCiVUeUnI1AlEGZ5yyYimPtZYaI4gCvpIaYVLwjLmthJayig8PSrQmPajaSpSb-QmKDf0F51XRi9fs40LwZYu38v-RcQYrXBttWGsu6xYgBjsO65i9gHC6LKdfDVgrvXapFQnf1YpA3WpDXWfNfS9HbW2LjMN9g1opRvMZIS3yiItOKrWBU0bJT7F8XA1cxxB0CURr1SQTaEDklggPKqnEMlUxCEutKI6+JDrunSsdciXTWFVL43xa1TibHsOpD0thtGnzXL4zipKrypWHcJD466EoHg9AkWIjDeklgSt9Hl1V33OBOBMQ9f7TKZQslZWy9lG0XuccVWIVhWL9wSDyhhaj1j0N2FKPYUwvAJXREhle7t12zFAniY+SxtgylI4gcjewtgbng41ejiMBxkCIEQMQPAaCwAAO75DHL+86TG9EEmjuSWUFZnB1QJFwvGUGZjhGdp1V2I712TsgzsJwBN0lVmPpiQzN1kPJ06OuzdG1OG7FXPRfFHDZ72bpsetNRnbqvnXVYZU7hnBYgYnEeExZC0hFsPEPYYZVRuBhgmwLDmGPvBcycMIvj3AVomGTceuTpj-SCaeGYsRoh+eM-+1DSsMOq3WNNHDc1YgmFfRuUkAcK1h12FZ9EDFzwzG2Rl46QXHMK2iExiIlElVQTorXUFhaSbrM2NxUbg86vBfSiJsTEmpOyaspl-zXYlP4ZiKcUWXLaobXW0NrbMbxshNbiZUzOT1gwohSSKFxwYWjIy8vFdKcXNceAt448Ho1TzACelt7IP0rvZRdh+ZYwtjAIrF+uNg9SSlfWMEcOYH1ncW2EDxHid5YAbR0chAvj8nklPpsXGp9LBH2J3EUnDFpWtSR8eg74nJMybkyji7tOAFsWsMRisPbJhuAh0T3YJOCZk6rLwgEpnVuIAWF10+kFSTxHiJEDXj8YDP1fpAcHUC1y7GotsTwvNDoJrCSYwRo62vo+4x4YmEMPPDxNlYGISQXfGOqTgkRTHB4gw0mDcCNV-rwh26H1B4engWKsTY9dPMuaIXsJiSwtdLY8q5szkthx-rfuwK7tPUSYlxJoFAbP5hc-hHz8EdwMwY8Bi1E4GsHNkop57FU0x67VTsvcxWpLFUgokjGYkIAA */
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
                      guard: ({ event }) => ToLowerCase(grammar.entities.origin, event.value[0].utterance) && ToLowerCase(grammar.entities.destination, event.value[0].utterance) && ToLowerCase(grammar.entities.day, event.value[0].utterance),
                      actions: assign({ 
                        Origin: ({ event }) => (grammar.entities.origin),
                        Destination: ({ event }) => (grammar.entities.destination),
                        Day: ({ event }) => (grammar.entities.day),
                      }),
                    },
                    {
                      target: "Origin",
                      guard: ({ event }) => !ToLowerCase(grammar.entities.origin, event.value[0].utterance),
                      actions: assign({
                        Destination: ({ event }) => {
                          if (ToLowerCase(grammar.entities.destination, event.value[0].utterance)) {
                            return grammar.entities.destination
                          }
                        },
                        Day: ({ event }) => {
                          if (ToLowerCase(grammar.entities.day, event.value[0].utterance)) {
                            return grammar.entities.day
                          }
                        },
                      }),
                    },
                    {
                      target: "Destination",
                      guard: ({ event }) =>!ToLowerCase(grammar.entities.destination, event.value[0].utterance),
                      actions: assign({
                        Origin: ({ event}) => {
                          if (ToLowerCase(grammar.entities.origin, event.value[0].utterance)) {
                            return grammar.entities.origin
                          }
                        },
                        Day: ({ event }) => {
                          if (ToLowerCase(grammar.entities.day, event.value[0].utterance)) {
                            return grammar.entities.day
                          }
                        },
                      }),
                    },
                    {
                      target: "Day",
                      guard: ({ event}) => !ToLowerCase(grammar.entities.day, event.value[0].utterance),
                      actions: assign({
                        Origin: ({ event}) => {
                          if (ToLowerCase(grammar.entities.origin, event.value[0].utterance)) {
                            return grammar.entities.origin
                          }
                        },
                        Destination: ({ event }) => {
                          if (ToLowerCase(grammar.entities.destination, event.value[0].utterance)) {
                            return grammar.entities.destination
                          }
                        },
                      }),
                    },
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
          },
          Ask: {
            entry: listen(),
            on: {
              RECOGNISED: [
                {
                  target: "#root.DialogueManager.Start.FULL_ANSWER",
                  guard: ({ event, context }) => ToLowerCase(grammar.entities.origin, event.value[0].utterance) && !!context.Destination && ToLowerCase(grammar.entities.day, event.value[0].utterance),
                  actions: assign({
                    Day: ({ event}) => {
                      if (ToLowerCase(grammar.entities.day, event.value[0].utterance)) {
                        return grammar.entities.day
                      }
                    },
                    Origin: ({ context }) => (grammar.entities.origin),
                  }),
                },
                {
                  target: "Ask_For_The_Day",
                  guard: ({ event, context}) => ToLowerCase(grammar.entities.origin, event.value[0].utterance) && !context.Day,
                  actions: assign({
                    Origin: ({ context }) => 
                    (grammar.entities.origin),
                  }),
                },
              ],
            },
          },
          Ask_For_The_Day: {
            entry: ({ context}) => {
              context.spstRef.send({
                type: "SPEAK",
                value: {utterance: `On what day would you like to fly from ${context.Origin}?`},
              });
            },
            on: { SPEAK_COMPLETE: "Ask_1"},
          },
          Ask_1: {
            entry: listen(),
            on: {
              RECOGNISED: [
                {
                  target: "Full_Answer_Origin_State",
                  guard: ({ event, context}) => ToLowerCase(grammar.entities.day, event.value[0].utterance) && !!context.Destination,
                  actions: assign({
                    Day: ({ context }) => 
                    (grammar.entities.day),
                  }),
                },
              ],
            },
          },
          Full_Answer_Origin_State: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: {utterance: `Okay, I will book the tickets from  ${context.Origin} to ${context.Destination} on the upcoming ${context.Day}.`},
              });
            },
          },
        },
      },
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
          },
          Ask: {
            entry: listen(),
            on: {
              RECOGNISED: [
                {
                  target: "Ask_For_The_Day",
                  guard: ({ event, context}) => ToLowerCase(grammar.entities.destination, event.value[0].utterance) && !ToLowerCase(grammar.entities.day, event.value[0].utterance),
                  actions: assign({
                    Destination: ({ context }) => 
                    grammar.entities.destination,
                  }),
                },
                {
                  target: "#root.DialogueManager.Start.FULL_ANSWER",
                  guard: ({ event, context}) => ToLowerCase(grammar.entities.destination, event.value[0].utterance) && !!context.Destination && ToLowerCase(grammar.entities.day, event.value[0].utterance),
                  actions: assign({
                    Destination: ({ context}) => (grammar.entities.destination),
                    Day: ({ event}) => {
                      if (ToLowerCase(grammar.entities.day, event.value[0].utterance)) {
                        return grammar.entities.day
                      }
                    },
                  }),
                },
              ],
            },
          },
          Ask_For_The_Day: {
            entry: ({ context}) => {
              context.spstRef.send({
                type: "SPEAK",
                value: {utterance: `On what day would you like to fly to ${context.Destination}?`},
              });
            },
            on: { SPEAK_COMPLETE: "Ask_1"},
          },
          Ask_1: {
            entry: listen(),
            on: {
              RECOGNISED: [
                {
                  target: "Full_Answer_Destination_State",
                  guard: ({ event, context}) => ToLowerCase(grammar.entities.day, event.value[0].utterance) && !!context.Destination,
                  actions: assign({
                    Day: ({ context }) => 
                      grammar.entities.day,
                  }),
                },
              ],
            },
          },
          Full_Answer_Destination_State: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: {utterance: `Okay, I will book the tickets from  ${context.Origin}  to ${context.Destination} on the upcoming ${context.Day}.`},
              });
            },
          },
        },
      },
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
          },
          Ask: {
            entry: listen(),
            on: {
              RECOGNISED: 
                {
                  target: "Full_Answer_Day_State",
                  guard: ({ event, context }) => ToLowerCase(grammar.entities.day, event.value[0].utterance) && !!context.Destination && !!context.Origin,
                  actions: assign({
                    Day: ({ context }) => (grammar.entities.day),
                  }),
                },  
            },
          },
          Full_Answer_Day_State: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: {utterance: `Okay, I will book the tickets from ${context.Origin} to ${context.Destination} on the upcoming ${context.Day}.`},
              });
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