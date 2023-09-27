import { createMachine, createActor, assign, fromPromise } from "xstate";
import { speechstate, Settings, Hypothesis,} from "speechstate";

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
  //music?: string; // play random music 
  singer?: string; // exact singer 
  volume?: string ; // how loud it should be plyed loud, medium, quiet
  song?: string; // name of the song 
  userInput?:string;
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
    interface Grammar {
      [index: string]
    }
  // machine
async function fetchFromChatGPT(prompt: string, max_tokens: number) {
  const myHeaders = new Headers();
  myHeaders.append(
    "Authorization",
    "Bearer ",
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
    max_tokens: 50,
  });

  
  const grammar: Grammar = {

  /*"play some music": {
    music: "random",
    volume: "loud"
  },
  "i would like to listen to classic": {
  music: "classic",
  volume: "loud"
},*/
  "i would like to listen to Avicii": {
    singer: "Avicii",
    volume: "loud"
},
"i would like to listen to Taylor Swift": {
  singer: "Taylor Swift",
  volume: "medium"
},
"play songs from Michael Jackson": {
  singer: "Michael Jackson",
  volume: "medium",
},
"play Vienna Calling from Falco": {
  singer: "Falco",
  volume: "medium",
  song: "Vienna Calling",
},

}; 


const ToLowerCase = (object: string) => {
  return object.toLowerCase().replace(/\.$/g, "");
    };
const lowerCaseGrammar = Object.keys(grammar).reduce((acc, key) => {
  acc[ToLowerCase(key)] = grammar[key];
  return acc;
}, {});
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
                entry: "speak.greeting",
                on: { SPEAK_COMPLETE: "help" },
              },
              help: {
                entry: say("Which music would you like to play?"),
                on: { SPEAK_COMPLETE: "Ask" },
              },
              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "ChatGPTanswers",
                    actions: [
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                   // target: 'CheckSlots'
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
              value: { utterance: "Hello! Welcome to your music operator." },
            });
          },
          "speak.help": ({ context }) =>
            context.spstRef.send({
              type: "SPEAK",
              value: { utterance: "How can I help you?" },
            }),
          "gui.PageLoaded": ({ }) => {
            document.getElementById("button").innerText = "Click to start!";
          },
          "gui.Inactive": ({ }) => {
            document.getElementById("button").innerText = "Inactive";
          },
          "gui.Idle": ({ }) => {
            document.getElementById("button").innerText = "Idle";
          },
          "gui.Speaking": ({ }) => {
            document.getElementById("button").innerText = "Speaking...";
          },
          "gui.Listening": ({ }) => {
            document.getElementById("button").innerText = "Listening...";
          },
          navigateFeedback: ({ context }) => {
            context.spstRef.send({
              type: "SPEAK",
              value: { utterance: `Alright, the music is playing on ${context.volume} volume. The song which is playing is ${context.song} by ${context.singer}` },
            });
          },
        },
      },
    },
      

      
    
    
    
    const actor = createActor(dmMachine).start();
    
    document.getElementById("button").onclick = () => actor.send({ type: "CLICK" });
    
    actor.subscribe((state) => {
      console.log(state.value);
    });
  

    /*guards: {
      ismusicMissing: ({ context }) => !context.music,
      issingernMissing: ({ context }) => !context.singer,
      issongMissing: ({ context }) => !context.song,
      istypeMissing: ({ context }) => !context.type,
      isvolumeMissing: ({ context }) => !context.volume,
    }*/ 