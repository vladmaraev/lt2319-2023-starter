import { createMachine, createActor, assign } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";
import { fromPromise } from 'xstate';

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "ad818b0cdae94e4ea41aec30f7342a73",
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
  // name: any;
}

//grammar for language change and next question

const grammar = {
  "italian": {
    entities: {
      italian: "italian"
    },
  },
  "swedish": {
    entities: {
      swedish: "swedish"
    },
  },
  "spanish": {
    entities: {
      spanish: "spanish"
    },
  },
  "portuguese": {
    entities: {
      portuguese: "portuguese"
    },
  },
  "french": {
    entities: {
      french: "french"
    },
  },
  "german": {
    entities: {
      german: "german"
    },
  },
  "translate in italian": {
    entities: {
      italian: "italian"
    },
  },
  "translate in swedish": {
    entities: {
      swedish: "swedish"
    },
  },
  "translate in spanish": {
    entities: {
      spanish: "spanish"
    },
  },
  "translate in portuguese": {
    entities: {
      portuguese: "portuguese"
    },
  },
  "translate in french": {
    entities: {
      french: "french"
    },
  },
  "translate in german": {
    entities: {
      german: "german"
    },
  },
  "next question": {
    entities: {
      next: "next question"
    },
  },
  "i have another question": {
    entities: {
      next: "next question"
    },
  },
  "i want to know more": {
    entities: {
      next: "next question"
    },
  },
  "i would like to ask something else": {
    entities: {
      next: "next question"
    },
  },
  "stop": {
    entities: {
      stop: "stop"
    },
  },
  "no more questions": {
    entities: {
      stop: "stop"
    },
  },
  "i don't have any more questions": {
    entities: {
      stop: "stop"
    },
  },
  "i don't want to ask anything": {
    entities: {
      stop: "stop"
    },
  },
}

//chat gpt keys:

async function fetchFromChatGPT(prompt: string, max_tokens: number) {
  const myHeaders = new Headers();
  myHeaders.append(
    "Authorization",
    "Bearer <key here>",
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
    temperature: 0.2,
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
                entry: "speak.greeting", //greeting state
                on: { SPEAK_COMPLETE: "GetName" }, //move to ask for name from here 
              },
              //new states for lab 1
              //SELECT A LANGUAGE
              GetName: {
                entry: say("If you don't mind me asking, what shall I call you?"),
                on: { SPEAK_COMPLETE: "AskName" },
              },
              AskName: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "Greet", //change state to say name. "so <name> what can i do for you today?"
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        username: ({event}) => event.value[0].utterance.replace(/\.$/g, ""),
                      }),
                    ],
                  },
                },
              },
              Greet: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `So ${context.username}, what would you like to know?`},
                  });
                },
                on: { SPEAK_COMPLETE: "askUniverse" },
              },
              //move to askUniverse
              askUniverse: {
                entry: listen(),
                on: {
                  RECOGNISED: [
                    {
                      target: "Universe", 
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                    },
                    {
                      target: "noMatch"
                    },
                  ],
                },
              },
              //ask about universe
              Universe: {
                invoke: {
                  src: fromPromise(async ({ input }) => {
                      const data = await fetchFromChatGPT(input.lastResult[0].utterance + " If the question is relevant to only astrophysics and space science, turn into a json form with the entities: name, description. Otherwise replace text in description with: 'I studied astrophysics. Your question is irrelevant to me.'", 100);
                      return data;
                    }),
                    input: ({ context }) => ({
                      lastResult: context.lastResult,
                      // userId: context.userId,
                    }),
                  onDone: {
                    target: "Filler",
                    // guard: ({event}) => {
                    //   if (isJSONString(event.output)) {
                    //     return true
                    //   } return false
                    // },
                    actions: [
                      assign({ 
                        name: ({event}) => JSON.parse(event.output).name || "",
                        description: ({event}) => JSON.parse(event.output).description || "I studied astrophysics. Your question is irrelevant to me.",
                      }),
                    ],
                  },
                  onError: {
                    target: "noMatch",
                  },
                },
              },
              noMatch: {
                entry: say("I studied astrophysics and science. I'm sorry but your question seems irrelevant. Try asking something else!"),
                on: { SPEAK_COMPLETE: "Greet" },
              },
              //state for filler before replying - is that making the pause smaller?
              Filler: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "Mmm! What an interesting question! Listen closely!"},
                  });
                },
                on: { SPEAK_COMPLETE: "retrieveReply" },
              },
              retrieveReply: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: context.description},
                  });
                },
                on: { SPEAK_COMPLETE: "askToTranslate" },
              },
              //say it in other languages (italian + swedish)
              askToTranslate: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "Is there anything else you would like to know? Maybe you would like to translate the previous answer to your native language? If you want a translation please say your prefered language, for exampple: english, italian, swedish. If you want to ask something else please say: next question! If you want to stop just say: stop!", voice: "en-GB-RyanNeural"},
                  });
                },
                on: { SPEAK_COMPLETE: "yesOrNo" },
              },
              yesOrNo: {
                entry: listen(),
                on: {
                  RECOGNISED: [
                    {
                      target: "TranslateIt", 
                      guard: ({event}) => {
                        const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                        if (u in grammar) {
                          if ("italian" in grammar[u].entities) {
                            console.log(grammar[u].entities["italian"])
                          return true
                        }
                        }
                        return false
                      }, 
                      actions: [
                      ({ event }) => console.log(event),
                    ],
                    },
                    {
                      target: "TranslateSwe", 
                      guard: ({event}) => {
                        const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                        if (u in grammar) {
                          if ("swedish" in grammar[u].entities) {
                            console.log(grammar[u].entities["swedish"])
                          return true
                        }
                        }
                        return false
                      }, 
                      actions: [
                      ({ event }) => console.log(event),
                    ],
                    },
                    {
                      target: "TranslateFr", //fr-FR-ClaudeNeural 
                      guard: ({event}) => {
                        const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                        if (u in grammar) {
                          if ("french" in grammar[u].entities) {
                            console.log(grammar[u].entities["french"])
                          return true
                        }
                        }
                        return false
                      }, 
                      actions: [
                      ({ event }) => console.log(event),
                    ],
                    },
                    {
                      target: "TranslateGer", //de-DE-AmalaNeural 
                      guard: ({event}) => {
                        const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                        if (u in grammar) {
                          if ("german" in grammar[u].entities) {
                            console.log(grammar[u].entities["german"])
                          return true
                        }
                        }
                        return false
                      }, 
                      actions: [
                      ({ event }) => console.log(event),
                    ],
                    },
                    {
                      target: "TranslateSpa", //es-ES-IreneNeural 
                      guard: ({event}) => {
                        const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                        if (u in grammar) {
                          if ("spanish" in grammar[u].entities) {
                            console.log(grammar[u].entities["spanish"])
                          return true
                        }
                        }
                        return false
                      }, 
                      actions: [
                      ({ event }) => console.log(event),
                    ],
                    },
                    {
                      target: "TranslatePort", //pt-BR-AntonioNeural
                      guard: ({event}) => {
                        const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                        if (u in grammar) {
                          if ("portuguese" in grammar[u].entities) {
                            console.log(grammar[u].entities["portuguese"])
                          return true
                        }
                        }
                        return false
                      }, 
                      actions: [
                      ({ event }) => console.log(event),
                    ],
                    },
                    {
                      target: "Goodbye", 
                      guard: ({event}) => {
                        const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                        if (u in grammar) {
                          if ("stop" in grammar[u].entities) {
                            console.log(grammar[u].entities["stop"])
                          return true
                        }
                        }
                        return false
                      }, 
                      actions: [
                      ({ event }) => console.log(event),
                    ],
                    },
                    {
                      target: "Greet", 
                      guard: ({event}) => {
                        const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                        if (u in grammar) {
                          if ("next" in grammar[u].entities) {
                            console.log(grammar[u].entities["next"])
                          return true
                        }
                        }
                        return false
                      }, 
                      actions: [
                      ({ event }) => console.log(event),
                    ],
                    },
                    {
                      target: "noMatch2",
                    },
                  ],
                },
              },
              noMatch2: {
                entry: say("I think I didn't hear you proprely! Could you, please, repeat?"),
                on: { SPEAK_COMPLETE: "yesOrNo" },
              },
              //translating in italian
              TranslateIt: {
                invoke: {
                  src: fromPromise(async ({ input }) => {
                      const data = await fetchFromChatGPT("Please translate this text to italian: " + input.description, 100);
                      return data;
                    }),
                    input: ({ context }) => ({
                      description: context.description,
                      // userId: context.userId,
                    }),
                  onDone: {
                    target: "ItWait",
                    actions: [
                      assign({ 
                        italianTranslation: ({event}) => event.output,
                      }),
                    ],
                  },
                  onError: {
                    target: "noMatch1",
                  },
                },
              },
              noMatch1: {
                entry: say("I studied astrophysics and science. I'm sorry but your question seems irrelevant. Try asking something else!"),
                on: { SPEAK_COMPLETE: "askToTranslate" },
              },
              ItWait: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "Naturalmente, è un piacere" , voice: "it-IT-GianniNeural"},
                  });
                },
                on: { SPEAK_COMPLETE: "ItalianCompleted" },
              },
              ItalianCompleted: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: context.italianTranslation , voice: "it-IT-GianniNeural"},
                  });
                },
                on: { SPEAK_COMPLETE: "askToTranslate" },
              },
              //translating in swedish
              TranslateSwe: {
                invoke: {
                  src: fromPromise(async ({ input }) => {
                      const data = await fetchFromChatGPT("Please translate this text to swedish: " + input.description, 100);
                      return data;
                    }),
                    input: ({ context }) => ({
                      description: context.description,
                    }),
                  onDone: {
                    target: "SweWait",
                    actions: [
                      assign({ 
                        swedishTranslation: ({event}) => event.output,
                      }),
                    ],
                  },
                  onError: {
                    target: "noMatch1",
                  },
                },
              },
              SweWait: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "Självklart, är det min glädje" , voice: "sv-SE-MattiasNeural"},
                  });
                },
                on: { SPEAK_COMPLETE: "SwedishCompleted" },
              },
              SwedishCompleted: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: context.swedishTranslation , voice: "sv-SE-MattiasNeural"},
                  });
                },
                on: { SPEAK_COMPLETE: "askToTranslate" },
              },
              //translating in portuguese
              TranslatePort: {
                invoke: {
                  src: fromPromise(async ({ input }) => {
                      const data = await fetchFromChatGPT("Please translate this text to portuguese: " + input.description, 100);
                      return data;
                    }),
                    input: ({ context }) => ({
                      description: context.description,
                      // userId: context.userId,
                    }),
                  onDone: {
                    target: "PortWait",
                    actions: [
                      assign({ 
                        portugueseTranslation: ({event}) => event.output,
                      }),
                    ],
                  },
                  onError: {
                    target: "noMatch1",
                  },
                },
              },
              PortWait: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "Claro, é um prazer" , voice: "pt-BR-AntonioNeural"},
                  });
                },
                on: { SPEAK_COMPLETE: "PortugueseCompleted" },
              },
              PortugueseCompleted: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: context.portugueseTranslation , voice: "pt-BR-AntonioNeural"},
                  });
                },
                on: { SPEAK_COMPLETE: "askToTranslate" },
              },
              //translating in german
              TranslateGer: {
                invoke: {
                  src: fromPromise(async ({ input }) => {
                      const data = await fetchFromChatGPT("Please translate this text to german: " + input.description, 100);
                      return data;
                    }),
                    input: ({ context }) => ({
                      description: context.description,
                      // userId: context.userId,
                    }),
                  onDone: {
                    target: "GerWait",
                    actions: [
                      assign({ 
                        germanTranslation: ({event}) => event.output,
                      }),
                    ],
                  },
                  onError: {
                    target: "noMatch1",
                  },
                },
              },
              GerWait: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "Natürlich, ist es mir ein Vergnügen" , voice: "de-DE-AmalaNeural "},
                  });
                },
                on: { SPEAK_COMPLETE: "GermanCompleted" },
              },
              GermanCompleted: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: context.germanTranslation , voice: "de-DE-AmalaNeural "},
                  });
                },
                on: { SPEAK_COMPLETE: "askToTranslate" },
              },
              //translating in spanish
              TranslateSpa: {
                invoke: {
                  src: fromPromise(async ({ input }) => {
                      const data = await fetchFromChatGPT("Please translate this text to spanish: " + input.description, 100);
                      return data;
                    }),
                    input: ({ context }) => ({
                      description: context.description,
                      // userId: context.userId,
                    }),
                  onDone: {
                    target: "SpWait",
                    actions: [
                      assign({ 
                        spanishTranslation: ({event}) => event.output,
                      }),
                    ],
                  },
                  onError: {
                    target: "noMatch1",
                  },
                },
              },
              SpWait: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "Por supuesto, es un placer" , voice: "es-ES-IreneNeural"},
                  });
                },
                on: { SPEAK_COMPLETE: "SpanishCompleted" },
              },
              SpanishCompleted: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: context.spanishTranslation , voice: "es-ES-IreneNeural"},
                  });
                },
                on: { SPEAK_COMPLETE: "askToTranslate" },
              },
              //translating in french
              TranslateFr: {
                invoke: {
                  src: fromPromise(async ({ input }) => {
                      const data = await fetchFromChatGPT("Please translate this text to french: " + input.description, 100);
                      return data;
                    }),
                    input: ({ context }) => ({
                      description: context.description,
                      // userId: context.userId,
                    }),
                  onDone: {
                    target: "FrWait",
                    actions: [
                      assign({ 
                        frenchTranslation: ({event}) => event.output,
                      }),
                    ],
                  },
                  onError: {
                    target: "noMatch1",
                  },
                },
              },
              FrWait: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "Bien sûr, avec plaisir!" , voice: "fr-FR-ClaudeNeural"},
                  });
                },
                on: { SPEAK_COMPLETE: "FrenchCompleted" },
              },
              FrenchCompleted: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: context.frenchTranslation , voice: "fr-FR-ClaudeNeural"},
                  });
                },
                on: { SPEAK_COMPLETE: "askToTranslate" },
              },
              Goodbye: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `I'm happy I could answer your science questions ${context.username}. Have a nice day!`, voice: "en-GB-RyanNeural"},
                  });
                },
                on: { SPEAK_COMPLETE: "IdleEnd" },
              },
              IdleEnd: {
                entry: "GUI.PageLoaded",
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
      "speak.greeting": ({ context }) => {
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Hello and welcome to your personal planitarium. My name is Mercurio and I'll be your guide. You can ask me anything you would like to know about space and the universe; from black holes to the closest galaxy to our Milky Way. Maybe you would like to know what gravity is and how it changes to various planets!" },
        });
      },
      "speak.how-can-I-help": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "How can I help you?" },
        }),
        CookBook: ({ context }) => {
            window.open(`https://www.cookingclassy.com/?s=${context.what}`,"_blank")
        },
      "gui.PageLoaded": ({}) => {
        document.getElementById("button").innerText = "Click to start!";
        document.querySelector(".animation-speaking").classList.remove("active");
        document.querySelector(".animation-listening").classList.remove("active");
        document.querySelector(".animation-speaking").classList.add("hidden");
        document.querySelector(".animation-listening").classList.add("hidden");
      },
      "gui.Inactive": ({}) => {
        document.getElementById("button").innerText = "Inactive";
        document.querySelector(".animation-speaking").classList.remove("active");
        document.querySelector(".animation-listening").classList.remove("active");
        document.querySelector(".animation-speaking").classList.add("hidden");
        document.querySelector(".animation-listening").classList.add("hidden");
      },
      "gui.Idle": ({}) => {
        document.getElementById("button").innerText = "Idle";
        document.querySelector(".animation-speaking").classList.remove("active");
        document.querySelector(".animation-listening").classList.remove("active");
        document.querySelector(".animation-speaking").classList.add("hidden");
        document.querySelector(".animation-listening").classList.remove("hidden");
      },
      "gui.Speaking": ({}) => {
        document.getElementById("button").innerText = "Speaking...";
        document.getElementById("button").className = "speakWave";
        document.querySelector(".animation-speaking").classList.add("active");
        document.querySelector(".animation-speaking").classList.remove("hidden");
        document.querySelector(".animation-listening").classList.remove("active");
        document.querySelector(".animation-listening").classList.add("hidden");
      },
      "gui.Listening": ({}) => {
        document.getElementById("button").innerText = "Listening...";
        document.getElementById("button").className = "listening";
        document.querySelector(".animation-speaking").classList.remove("active");
        document.querySelector(".animation-speaking").classList.add("hidden");
        document.querySelector(".animation-listening").classList.add("active");
        document.querySelector(".animation-listening").classList.remove("hidden");
      },
    },
  },
);

const actor = createActor(dmMachine).start();

document.getElementById("button").onclick = () => actor.send({ type: "CLICK" });


actor.subscribe((state) => {
  console.log(state.value);
});



