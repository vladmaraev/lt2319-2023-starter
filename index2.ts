import { createMachine, createActor, assign, fromPromise } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "994d7aefd0894deca17e2b24dc6b7daf",
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
  singer?: string ; 
  info?: string; 
}; 


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


    async function fetchFromChatGPT(prompt: string, max_tokens: number) {
      const myHeaders = new Headers();
      myHeaders.append(
        "Authorization",
        "Bearer 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 ",
      ),
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
const dmMachine = createMachine (
  {
    id: "root",
    type: "parallel",
    states: {
      DialogueManager: {
        initial: "Prepare",
        states: {
          Prepare: {
            on: { ASRTTS_READY: "Start" },
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
        Start: {
          initial: "Greeting",
          states: {
            Greeting: {
              entry: ("speak.greeting"),
              on: { SPEAK_COMPLETE: "Ask" },
            },
        Ask: {
            entry: listen(),
            on: {
              RECOGNISED: {
                target: "AskGPT",
                actions: [
                  assign({
                    lastResult: ({ event }) => event.value,
                  }),
                ],
              },            
            },
          },             
          AskGPT:{
            invoke: {
              src: fromPromise(async({input}) => {
                  const data = await fetchFromChatGPT(
                    input.lastResult[0].utterance + "reply in a json format with entities singer and info. If I don't mention any of them, leave it empty.",500,
                    );
                    return data;
                }),
                input:({context,event}) => ({
                  lastResult: context.lastResult,
                }),
                onDone: {
                  actions: [
                    ({ event }) => console.log((event.output)),
                    assign({
                      singer: ({ event }) => JSON.parse(event.output).singer, 
                      info: ({ event }) => JSON.parse(event.output).info, 
                    }),
                  ],
                  target: 'SayBack'
                }
                  }
                },
          SayBack: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `Okay. ${context.singer}. ${context.info}` },
              });
            },
            target: 'moreInfo'
          },
          moreInfo: {
            entry: say("Do you want to know something more?"),
            on: { SPEAK_COMPLETE: "decision" },
          }, 
          decision: {
            entry: listen(),
            on: {
              RECOGNISED: [
                {
                  target: "#root.DialogueManager.Prepare",
                  guard: ({ context, event }) => {
                    const userInput = ToLowerCase(event.value[0].utterance)
                    return userInput === "no";
                  },
                },    
                {
                  target: "AskGPT",
                  guard: ({ context, event }) => {
                    const userInput = ToLowerCase(event.value[0].utterance)
                    return userInput === "yes";
                  },
                },               
              ],
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

    actions: {
      prepare: ({ context }) =>
        context.spstRef.send({
          type: "PREPARE",
        }),

      "speak.greeting": ({ context }) => {
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Hello! Ask me anything. For example what is X famous for. Whereas X is a singer" },
        });
      },

    
      
          
        "gui.PageLoaded": ({ }) => {
          document.getElementById("button")!.innerText = "Click to start!";
        },
        "gui.Inactive": ({ }) => {
          document.getElementById("button")!.innerText = "Inactive";
        },
        "gui.Idle": ({ }) => {
          document.getElementById("button")!.innerText = "Idle";
        },
        "gui.Speaking": ({ }) => {
          document.getElementById("button")!.innerText = "Speaking...";
        },
        "gui.Listening": ({ }) => {
          document.getElementById("button")!.innerText = "Listening...";
        },
    }, 
    },
);

const actor = createActor(dmMachine).start();

document.getElementById("button")!.onclick = () => actor.send({ type: "CLICK" });

actor.subscribe((state) => {
  console.log(state.value);
});

