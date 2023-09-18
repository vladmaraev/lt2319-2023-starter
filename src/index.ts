import { createMachine, createActor, assign, fromPromise } from "xstate";
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
        intent: string;
        entities: {
          [index: string]: string;
        };
      };
    }
    
    const grammar: Grammar = {
      "what is the recipe name": {
        intent: "None",
        entities: { recipeName: "The name of the recipe is" },
      },
      "what is the preparation time": {
        intent: "None",
        entities: { prepTime: "The preparation time is" },
      },
      "what is the cooking time": {
        intent: "None",
        entities: { cookTime: "The cooking time is" },
      },
      "what is the number of servings": {
        intent: "None",
        entities: { servings: "The number of servings is" },
      },
      "what are the ingredients": {
        intent: "None",
        entities: { ingredients: "The ingredients are" },
      },
      "what are the instructions": {
        intent: "None",
        entities: { instructions: "The instructions are" },
      },
    };

    const modify = (sentence: string, entity: string) => {
      console.log(sentence.toLowerCase().replace(/\?$/, ''))
    if (sentence.toLowerCase().replace(/\?$/, '') in grammar) {
      if (entity in grammar[sentence.toLowerCase().replace(/\?$/, '')].entities) {
        return grammar[sentence.toLowerCase().replace(/\?$/, '')].entities[entity];
      }
    }
        return false;
    };
      

    async function fetchFromChatGPT(prompt: string, max_tokens: number) {
      const myHeaders = new Headers();
      myHeaders.append(
        "Authorization",
        "Bearer",
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
        max_tokens: 1000,
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
    id: "root",
    type: "parallel",
    states: {
      DialogueManager: {
        initial: "Prepare",
        states: {
          Prepare: {
            on: { ASRTTS_READY: "Prompt" },
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
          Prompt: {
            initial: "Greeting",
            states: {
              Greeting: {
                entry: "speak.greeting",
                on: { SPEAK_COMPLETE: "Ask" },
              },
              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "AskChatGPT",
                    actions: [
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                  },
                },
              },
              AskChatGPT: {
                invoke: {
                    src: fromPromise(async ({ input }) => {
                        const data = await fetchFromChatGPT(
                            input.lastResult[0].utterance + "give it to me in a json format with entities: recipeName, prepTime, cookTime, servings, ingredients and instructions",
                            40,
                        );
                        return data;
                    }),
                    input: ({ context, event }) => ({
                        lastResult: context.lastResult,
                    }),
                    onDone: {
                        target: "SayBack",
                        actions: [
                          ({ event }) => console.log(JSON.parse(event.output)),
                          assign({ recipeName: ({ event }) => JSON.parse(event.output).recipeName,
                        prepTime: ({event}) => JSON.parse(event.output).prepTime,
                        cookTime: ({ event }) => JSON.parse(event.output).cookTime,
                        servings: ({ event }) => JSON.parse(event.output).servings,
                        ingredients: ({ event }) => JSON.parse(event.output).ingredients,
                        instructions: ({ event }) => JSON.parse(event.output).instructions,
                      }),
                    ],
                    },
                },
              },
              SayBack: {
                entry: ({ context }) => {
                    context.spstRef.send({
                        type: "SPEAK",
                        value: { utterance: "Okay the recipe is ready!" },
                    });
                },
                on: { SPEAK_COMPLETE: "Questions" },
              },
              Questions: {
                entry: listen(),
                on: {
                  RECOGNISED: [{
                    target: "name",
                    guard: ({ event }) => modify(event.value[0].utterance, "recipeName"),
                    actions: assign({
                      name: ({ event }) => modify(event.value[0].utterance, "recipeName"),
                    }),
                },
                {
                  target: "prep",
                  guard: ({ event }) => modify(event.value[0].utterance, "prepTime"),
                  actions: assign({
                    prep: ({ event }) => modify(event.value[0].utterance, "prepTime"),
                  }),
              },
              {
                target: "cook",
                guard: ({ event }) => modify(event.value[0].utterance, "cookTime"),
                actions: assign({
                  cook: ({ event }) => modify(event.value[0].utterance, "cookTime"),
                }),
            },
            {
              target: "serve",
              guard: ({ event }) => modify(event.value[0].utterance, "servings"),
              actions: assign({
                serve: ({ event }) => modify(event.value[0].utterance, "servings"),
              }),
          },
          {
            target: "ing",
            guard: ({ event }) => modify(event.value[0].utterance, "ingredients"),
            actions: assign({
              ing: ({ event }) => modify(event.value[0].utterance, "ingredients"),
            }),
        },
        {
          target: "ins",
          guard: ({ event }) => modify(event.value[0].utterance, "instructions"),
          actions: assign({
            ins: ({ event }) => modify(event.value[0].utterance, "instructions"),
          }),
      },
              ],
            },
          },
          name: {
            entry: ({ context }) => {
              context.spstRef.send({
                  type: "SPEAK",
                  value: { utterance: `${context.name} ${context.recipeName}` },
              });
          },
          on: { SPEAK_COMPLETE: "Questions" },
        },
        prep: {
          entry: ({ context }) => {
            context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `${context.prep} ${context.prepTime}` },
            });
        },
        on: { SPEAK_COMPLETE: "Questions" },
      },
      cook: {
        entry: ({ context }) => {
          context.spstRef.send({
              type: "SPEAK",
              value: { utterance: `${context.cook} ${context.cookTime}` },
          });
      },
      on: { SPEAK_COMPLETE: "Questions" },
    },
    serve: {
      entry: ({ context }) => {
        context.spstRef.send({
            type: "SPEAK",
            value: { utterance: `${context.serve} ${context.servings}` },
        });
    },
    on: { SPEAK_COMPLETE: "Questions" },
  },
  ing: {
    entry: ({ context }) => {
      context.spstRef.send({
          type: "SPEAK",
          value: { utterance: `${context.ing} ${context.ingredients}` },
      });
  },
  on: { SPEAK_COMPLETE: "Questions" },
},
ins: {
  entry: ({ context }) => {
    context.spstRef.send({
        type: "SPEAK",
        value: { utterance: `${context.ins} ${context.instructions}` },
    });
},
on: { SPEAK_COMPLETE: "Questions" },
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
          value: { utterance: "Hi. I'm a virtual chef. Ask me for any recipe you like!" },
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
