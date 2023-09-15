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
  "put the red book on the table": {
    entities: {
      color: "red",
      object: "book",
      place: "table",
        },
      },
  "put the blue book on the shelf": {
    entities: {
      color: "blue",
      object: "book",
      place: "shelf",
        },
      },
  "I have a book" :{
    entities: {
      object: "book",

      },
    },
};

const ToLowerCase = (object: string) => {
 return object.toLowerCase().replace(/\.$/g, "");
  }


  async function fetchFromChatGPT(prompt: string, max_tokens: number) {
    const myHeaders = new Headers();
    myHeaders.append(
      "Authorization",
      "Bearer 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",
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
  
// machine
const dmMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QCcD2qAuA6AIgSwEMAbVKAVzAFkCA7AmZLABWTAAcDWBiAQQGUASgBUhfAPoCAojxwBNANoAGALqJQbVLDwY8qGmpAAPRACYAzIqwBOAKxmAjDZN2bADhMB2LwBoQAT0R7DwAWLEVwiPsrADZo4ODXAF9E3zRMXEIScipaejBGACFMAAsAMTxkWAweGgg+MABjPQgscsrsFlQAWzYMLj4maQBpMQBhAHlKJgAZSSFJJVUkEA0tHT0DYwQzNzDok2CrDxN9m2CTZ18AhFdXGyxHcJNFV3DXK3tk1PRsfGJSCjUOgMLBFDBlCpVGp1RrNVqQ7A8WAAay4UgmAHEAHIAST4khwiwMq20un0yy2HjMriw0UUjleFw8VkUVjMV0QVnOYXM51iHiCJlcwS+IDSv0yAJywPyoJKbShtXqTVq8PaWCRqPR42xeIJ8nsS3UmlJGwpiCpNLpDMUTJZbI5CHsimCHiwTjM1Ne0Q+hxMovFGX+2SBeUK8oR0OVcIViJRaMkmNx+MJJiNKxN63JoEp1Np9Lcts89vZ-kQrjM0XdvLMnme0S8-pSYp+QaygNyILBEPaUdhqtjGvj2t1KfkZnTJKzmwteethbtrNL13sjjMPM9h2CsRsHltAdbf3b0rDcvBsb7Kpao2KjWRYnGACMAFaNDBiWgQMaoEiMHEQIgwC4UocWmaYHwKAApRMhCJZYpzJGcEGce5nUcQ5XGiVw92FR17GCewqyOOJogcC5FBCJtvnSI8pVDLsI17JV+2vW8GnvJgiAIBowCwf9AOA0DwJmHhRgWFRiUzRDzWQmxUILDCsJw4JHWiM4sEOKwtKpZwzEOaIDxoyUQ07WVuwvZirywG872-X8P1qMROO43j+KAkCwLGcZpnGAQ4ONNZpJzUw5IeBSrEw7CXhUssnTUoiPDU2sTjZJJm0DDEAFUcWYPJplQAgIEgLhRmmHFRiGfyM0Cs1guQo4sEw44XSw7C2XsPD3isMIIieewK2pMxDOwLKcp4BodAAN1cgCgJEcQ+CEHhhH1CT4Kk2qjEQMjGuCMxjmCF44gSaJHU8YJ7jsU4KIurwG2GrBRo1Ca8GmvjZt4QQxEW5b5kJNaAtNbMtu2ewTF2-aDiO+JMLOuJLEUSsdniOTokIh6nvGqbeL4NgwAIZE8BoKB+kGHgRgmKZZnmKqEM2rYduFSHDswmHTtilL7kR-Z4nw+xPSsDHsue7GsGmPAqjAGgiZJkdk1WycNuBhm7A0qxyJsfqmXwmwzrcbqrr0jw7lXY2DPS1snpxOgXumz7hFECRpDkWmlaQoV1wbGJhVuV0nFcM6Lm6i6LG3VxHC0mxkmbGhUCK+BlnFSSauVxAAFoLsdNODge2iTJlZBk6BpDl0QUj3V6pwYk8Vlc+MjsC+YVgOFYIvpxk448M1nqIjU8xPVeEULaM4MG9PczI0s5o26CkHNcdc57Ar3rXT2958Lr0eTwY89J5hKzYxn+nOSsR0Qm63r+ball3k3496LMxjFX3mMESb7peiP1OnVdR1MPBx49IXg2Aoj6O+dFTLhl3kxF+A436ai-khOS3U4jCk8D6Z44cYrXH-g8EBQC7igMFsPCUW8H5QJ7M-aMcD1SlDIEQIgYgaiwAAO75EQTJNC659qa0RqufkzJHRcnBr1EwXIXQtXAfnceT9qhTxoVULAWJUCjB-KgQu60U5IS4VgHhzoHCEQbII2KzpXRqy0s4H05xFBqSkWPHelC5GwJaIOZRT5XwTQ4XVHRei+GGK8KfExjhwZaUjiYKItxsIeDsdvR+0CqEsTVIo5RzkeJeJBj4jwvCDECMCTgysy8nhdUrNuGJ5CzyOMvHCGy7EHwvjfA5L8qjfzpK2FpPCngl6ujiJrC4-M1JpWoqQ++kCKkWWcdZNi953ENM-HZdR71AKtMCAKfMjgbAxA+PsQieECJum6RdDClZYjmyGW2CBjcJ4wOoaxWyMyJqNPmYwTUYhSjqLqR498czmnqOWQgAioQEh7Swojbcdg8JmDZNYRKKNEbI1dGU0ZVyElWRqdM+pDzvlqL-LNSQtQ-n4Q8BC3YxEYb7XVmIqiLYR4jMubIqpqo0VOS4mkzRxcZLtNiiAi+l89w632Kc6lwyLkyPiU4m5kzbKpJmkstl7dvGrPnBsn0hFwns2uGpUIoTtK1jsPpRFdKxUMtubU6VQ57xvOQMylyfzDqhCCEcfhLIQFnFUg4cxEUqRZKZIKwMed7FxMqfIk1HEWUyrAHiiABLf5cpiB6lkzUPhRANaKoNEymU-KtXM6VfzOUrk1l0mFAo7DuBOFSv19dYkUPGRKjN2LHlmrcgSxVBZlVbLVXhNS+zEp2AuD6akKaHE1sSXW+y2aw3mtee8zNDaw22psbSQ6pENm6UXkSkxpF1zEScOYKIzhBlCvOdIode9a1TKebOlyiyI34rlbPLYhKu4RWhX3GwsQtzOCFjiP54TOqrg0j2hI7hIWQqjiQx6wsmB5QKkVKNd7j4IE7iY94NJiJ0jESA+KX6RavTAH8n0Z0tzWCrhFE4tYuRDzOZjW24aCVBD1h8WkmEHARVZHJaJ4HqOi1xvjQmxM-ma0BWIzVmsNlRLhthYjYiTqvCCJ8Tjwssa4bFhLDAUsZYCfwhpYTZxROevXdcfd4MQ6KA9CyIBHGqPC2ttxbGfzsKBwXSHNCRwHB6WjokIAA */
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
                      RECOGNISED: [
                        {
                          target: "CHAT",
                          actions: [
                          assign ({
                            lastResult: ({ event }) => event.value,
                            }),
                          ],
                        },
                        {
                          target: "#Full_Answer",
                          guard: ({ event }) => {
                            const utterance = ToLowerCase(event.value[0].utterance);
                            const grammarEntry = grammar[utterance] || {};
                      
                            // Check if all three properties (color, object, place) are defined
                            return (
                              grammarEntry.entities &&
                              grammarEntry.entities.color &&
                              grammarEntry.entities.object &&
                              grammarEntry.entities.place
                            );
                          },
                          actions: assign({
                            Color: ({ event }) => {
                              const utterance = ToLowerCase(event.value[0].utterance);
                              return (grammar[utterance]?.entities?.color || null);
                            },
                            Object: ({ event }) => {
                              const utterance = ToLowerCase(event.value[0].utterance);
                              return (grammar[utterance]?.entities?.object || null);
                            },
                            Place: ({ event }) => {
                              const utterance = ToLowerCase(event.value[0].utterance);
                              return (grammar[utterance]?.entities?.place || null);
                            },
                          }),
                        },
                        {
                          //has the object but no color or place
                          target: "#NoColor",
                          guard: ({ event }) => {
                            const utterance = ToLowerCase(event.value[0].utterance);
                            const grammarEntry = grammar[utterance] || {};
                        
                            // Check if the 'object' property is defined
                            return grammarEntry.entities && 
                            grammarEntry.entities.object !== null;
                          },
                          actions: assign({
                            Object: ({ event }) => {
                              const utterance = ToLowerCase(event.value[0].utterance);
                              const grammarEntry = grammar[utterance] || {};
                              return (grammarEntry.entities?.object || null);
                            },
                          }),
                        },
                        {
                          //has the color and the object but no place
                          target: "#NoPlace",
                          guard: ({ event }) =>{
                            const utterance = ToLowerCase(event.value[0].utterance);
                            const grammarEntry = grammar[utterance] || {};

                            return (
                              grammarEntry.entities &&
                              grammarEntry.entities.color &&
                              grammarEntry.entities.object
                            );
                          },
                          actions: assign({
                            Color: ({ event }) => {
                              const utterance = ToLowerCase(event.value[0].utterance);
                              return (grammar[utterance]?.entities?.color || null);
                            },
                            Object: ({ event }) => {
                              const utterance = ToLowerCase(event.value[0].utterance);
                              return (grammar[utterance]?.entities?.object || null);
                            },
                          }),
                        },
                        {
                          //has the place but no color or object
                          target: "#NoObject",
                          guard: ({ event}) => {
                            const utterance = ToLowerCase(event.value[0].utterance);
                            const grammarEntry = grammar[utterance] || {};

                            return (
                              grammarEntry.entities &&
                              grammarEntry.entities.place
                            );
                          },
                          actions: assign({
                            Place: ({ event }) => {
                              const utterance = ToLowerCase(event.value[0].utterance);
                              return (grammar[utterance]?.entities?.place || null);
                            },
                          }),
                        },
                      ], 
                  },
                },
                CHAT:{
                  id: "CHAT",
                  invoke: {
                    src: fromPromise(async ({ input }) => {
                      const data = await fetchFromChatGPT(
                        input.lastResult[0].utterance, 40
                        );
                        return data;
                    }),
                    input: ({ context, event}) => ({
                      lastResult: context.lastResult,
                    }),
                    onDone: {
                      target: "Answer",
                      actions: assign({ Answer: ({ event }) => event.output}),
                    },
                  },
                },
                Answer: {
                  id: "Answer",
                  entry: ({ context}) => {
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: context.Answer},
                    });
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
                        on: { SPEAK_COMPLETE: "#Ask" },
                      });
                    },
                  },
                  NoColor:{
                    id: "NoColor",
                    entry: ({ context }) => {
                      context.spstRef.send({
                        type: "SPEAK",
                        value: {
                          utterance: `I'm gonna need additional information about the ${context.Object}`,
                        },
                        on: { SPEAK_COMPLETE: "#Second" },
                        raise: ({type: "FILL_COLOR"}),
                      });
                    },
                  },
                  NoObject: {
                    id: "NoObject",
                    entry: raise ({type: "FILL_OBJECT"})},
                  NoPlace: {
                    id: "NoPlace",
                    entry: raise ({type: "FILL_PLACE"})},
                },
              },
              Check_Object_and_Color:{
                id: "Forth",
                initial: "Idle",
                states: {
                  Idle: {on: {FILL_OBJECT: "#Ask_For_Object_and_Color"}},
                  Ask_For_Object_and_Color: {
                    id: "Ask_For_Object_and_Color",
                    entry: ({ context}) => {
                      context.spstRef.send({
                        type: "SPEAK",
                        value: {
                          utterance: `So what would you like put one the ${context.Place} and what color is it?`,
                        },
                        on: { SPEAK_COMPLETE: "#IdleEnd"},
                      });
                    },
                  },
                  IdleEnd: {
                    id: "IdleEnd",
                  },
                },
              },
              Check_Place:{
                id: "Third",
                initial: "Idle",
                states: {
                  Idle: {on: { FILL_PLACE: "#Ask_For_Place"}},
                  Ask_For_Place: {
                    id: "Ask_For_Place",
                    entry: ({ context }) => {
                      context.spstRef.send({
                        type: "SPEAK",
                        value: {
                          utterance: `So, I have a ${context.Object} ${context.Color}. Where do you want to put the ${context.Object}?`,
                        },
                        on: { SPEAK_COMPLETE: "#IdleEnd" },
                      });
                    },
                  },
                  IdleEnd:{
                    id: "IdleEnd",
                  },
                },
              },
              Check_Color_and_Place: {
                id: "Check_Color_and_Place",
                initial: "Idle",
                states: {
                  Idle: { on: { FILL_COLOR: "Ask_For_Color_and_Place" } },
                  Ask_For_Color_and_Place: {
                    id: "Ask_For_Color_and_Place",
                    entry: ({ context }) => {
                      context.spstRef.send({
                        type: "SPEAK",
                        value: {
                          utterance: `OK, I have a ${context.Object}. What color is it and what would you like me to do with it?`,
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