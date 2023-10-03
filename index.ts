import { createMachine, createActor, assign, fromPromise } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";



const API_KEY = '';
const API_ENDPOINT = 'https://www.googleapis.com/youtube/v3';


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
  volume?: string; 
  singer?: string ; 
  song?: string; 
  
}; 

const grammar = {
   
  // here are "shortcuts", when one just want to answer one-word utterances 
      "I want to hear Vienna Calling from Falco": {
        song: "Vienna Calling",
        singer: "Falco",
      },
      "play Rock me Amadeus from Falco": {
        song: "Rock me Amadeus",
        singer: "Falco",
      },
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


    async function fetchfromYoutube(prompt: string, max_tokens: number) {
      const myHeaders = new Headers();
      myHeaders.append(
        "Authorization",
        "Bearer ",
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
    const lowerCaseGrammar = Object.keys(grammar).reduce((acc, key) => {
      acc[ToLowerCase(key)] = grammar[key];
      return acc;
    }, {});

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
        },
      },
      Ready: {
        initial: "Greeting",
        states: {
          Greeting: {
            entry: "speak.greeting",
            on: { SPEAK_COMPLETE: "HowCanIHelp" },
          },
          HowCanIHelp: {
            entry: say("You can say whatever you like."),
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
          ChatGPTanswers:{
            invoke: {
              src: fromPromise(async({input}) => {
                const data = await fetchFromChatGPT(
                  input.lastResult[0].utterance,40,
                  );
                  return data;
              }),
              input:({context,event}) => ({
                lastResult: context.lastResult,
              }),
              onDone: {
                target: "SayBack",
                actions: assign({SayBack:({ event}) => event.output }),
                }
              }
          },
          SayBack: {
            entry: ({ context }) => {
                context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: context.SayBack },
                });
            },
            on: { SPEAK_COMPLETE: "..Ready" },
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
    {
    actions: {
      prepare: ({ context }) =>
        context.spstRef.send({
          type: "PREPARE",
        }),
      // saveLastResult:
      "speak.greeting": ({ context }) => {
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Hello world!" },
        });
      },
      "speak.how-can-I-help": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "How can I help you?" },
        }),
      "gui.PageLoaded": ({}) => {
        document.getElementById("button")!.innerText = "Click to start!";
      },
      "gui.Inactive": ({}) => {
        document.getElementById("button")!.innerText = "Inactive";
      },
      "gui.Idle": ({}) => {
        document.getElementById("button")!.innerText = "Idle";
      },
      "gui.Speaking": ({}) => {
        document.getElementById("button")!.innerText = "Speaking...";
      },
      "gui.Listening": ({}) => {
        document.getElementById("button")!.innerText = "Listening...";
      },
      navigateFeedback: ({ context }) => {
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: `Alright, the volume is turned on ${context.volume}, the song is named ${context.song} and it is performed by ${context.singer}.` },
        });
      },
    },
    },
      },      


const actor = createActor(dmMachine).start();

document.getElementById("button")!.onclick = () => actor.send({ type: "CLICK" });

actor.subscribe((state) => {
  console.log(state.value);
});