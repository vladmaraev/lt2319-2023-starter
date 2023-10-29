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
  song?: string; 
  singerinfo?: string;
  
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
        "Bearer  ",
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
    const ToLowerCase = (object: string) => {
      return object.toLowerCase().replace(/\.$/g, "");
        };





        
        interface Grammar {
          [index: string]: {
            intent: string;
            entities: {
              [index: string]: string;
            };
          };
        }
    
        const grammar: Grammar = {
          "who is Michael Jackson": {
            intent: "None",
            entities: { singer: "Michael Jackson" },
          },
          "who is Taylor Swift": {
            intent: "None",
            entities: { singer: "Taylor Swift" },
          },
          "who is Elton John": {
            intent: "None",
            entities: { singer: "Elton John" },
          },
          "who is Madonna": {
            intent: "None",
            entities: { singer: "Madonna" },
          },
          "who is Britney Spears": {
            intent: "None",
            entities: { singer: "Britney Spears" },
          },
        };



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
                target: "AskChatGPT",
                actions: [
                  assign({
                    lastResult: ({ event }) => event.value,
                  }),
                ],
              },
              // RECOGNISED: [
              //   {
              //     target: "AskChatGPTAboutSinger",
              //     guard: ({ context, event }) => {
              //       const userInput = ToLowerCase(event.value[0].utterance);
              //       return (
              //         userInput.includes("who") ||
              //         userInput.includes("question") ||
              //         userInput.includes("singer")
              //       );
              //     },
              //   },
              // ],              
            },
          },             
          AskChatGPT:{
            invoke: {
              src: fromPromise(async({input}) => {
                  const data = await fetchFromChatGPT(
                    input.lastResult[0].utterance + "reply in a json format with entity: singer. If I don't mention any of them, leave it empty.",40,
                    );
                    return data;
                }),
                input:({context,event}) => ({
                  lastResult: context.lastResult,
                }),
                onDone: {
                  actions: [
                    ({ event }) => console.log(JSON.parse(event.output)),
                    assign({
                      singer: ({ event }) => JSON.parse(event.output).singer,  
                    }),
                  ],
                }
                  }
                },
          SayBack: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `Okay. Here is the information about ${context.singer}` },
              });
            },
          },
            // on: {
            //   SPEAK_COMPLETE: "" // Replace "SomeOtherState" with the appropriate state to transition to.
            // },
          
          
        // SayChatGPTResponse: {
        //   entry: ({ context }) => {
        //     context.spstRef.send({
        //         type: "SPEAK",
        //         value: { utterance: "" },
        //     });
        // },
        // on: { SPEAK_COMPLETE: "AskAboutSinger" },
        // }, 
        // AskAboutSinger: {
        //   entry: "",
        //   on: {
        //     SPEAK_COMPLETE: "ListenForSinger",
        //   },
        // },
        // ListenForSinger: {
        //   entry: listen(),
        //   on: {
        //     RECOGNISED: [
        //       {
        //         target: "AskChatGPTAboutSinger",
        //         guard: ({ event }) => {
        //           const userInput = ToLowerCase(event.value[0].utterance);
        //           // Check if the user's input indicates a question about a singer
        //           return userInput.includes("singer");
        //         },
        //       },
        //       {
        //         target: "AskChatGPTAboutSinger", // Handle other queries about music here
        //       },
        //     ],
        //   },
        // },
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
          value: { utterance: "Let's start by asking a question about a celebrity" },
        });
      },

        // "speak.singerinfo": ({ context }) => 
        // context.spstRef.send({
        //   type: "SPEAK",
        //   value: { utterance: `Here you go ${context.singerinfo}` },
        // }),
        
      
          
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

