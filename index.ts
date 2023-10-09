import { createMachine, createActor, assign, fromPromise } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";



const API_KEY = 'AIzaSyAz57pQL8mp62cGau0WCYgYKpI44Ivbqe4';
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

const openYouTube =
  ({ context }) =>
  ({ send }) => {
    // Check if both song and singer are defined in the context
    if (context.song && context.singer) {
      const searchQuery = `${context.song} ${context.singer}`;
      const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

      // Open YouTube in a new tab with the search query
      window.open(youtubeSearchUrl);
    }
  };


interface DMContext {
  spstRef?: any;
  lastResult?: Hypothesis[];
  singer?: string ; 
  song?: string; 
  singerquestion?: string;
  
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
      "play Bohemian Rhapsody from Queen": {
        song: "Bohemian Rhapsody",
        singer: "Queen",
      },
      "I want to listen to lo-fi": {
        song: "lo-fi",
        singer:"lofi"
      }
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
        "Bearer AIzaSyAz57pQL8mp62cGau0WCYgYKpI44Ivbqe4",
      ),
      myHeaders.append("Content-Type", "application/json");
      const raw = JSON.stringify({
        model: "?access_token=oauth2-token",
        messages: [
                {
                  role: "user",
                  content: prompt,
                },
              ],
        temperature: 0,
        max_tokens: max_tokens,
      });
    
      const response = fetch('https://youtube.googleapis.com/youtube/v3/search?key=AIzaSyAz57pQL8mp62cGau0WCYgYKpI44Ivbqe4', {
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
    const ToLowerCase = (object: string) => {
      return object.toLowerCase().replace(/\.$/g, "");
        };
    const lowerCaseGrammar = Object.keys(grammar).reduce((acc, key) => {
      acc[ToLowerCase(key)] = grammar[key];
      return acc;
    }, {});

    function openYouTubeVideo(context, event) {
      const singer = context.singer;
      const song = context.song;
      let embeddedLink;
    
      // Construct the YouTube embed link based on the recognized singer and song
      if (singer === "Falco" && song === "Vienna Calling") {
        embeddedLink = "https://www.youtube.com/watch?v=sIRFVIRsRts"; 
      } else if (singer === "Queen" && song === "Bohemian Rhapsody") {
        embeddedLink = "https://www.youtube.com/watch?v=fJ9rUzIMcZQ"; 
      }
      else if (singer === "Falco" && song === "Rock me Amadeus") {
        embeddedLink = "https://www.youtube.com/watch?v=kVNPwmFkf-Q"; 
      }
      else if (singer === "lofi" && song === "lofi") {
        embeddedLink = "https://www.youtube.com/watch?v=jfKfPfyJRdk"; 
      }
      // Add more cases for other singers and songs as needed
    
      if (embeddedLink) {
        // Open the YouTube video with the embedded link
        window.open(embeddedLink);
      } else {
        // Handle the case when the singer and song combination is not recognized
        console.log("Singer and song combination not recognized");
      }
    }
    

    openYouTubeVideo({ singer: "Queen", song: "Bohemian Rhapsody" });
    openYouTubeVideo({ singer: "Falco", song: "Vienna Calling" });
    openYouTubeVideo({ singer: "Falco", song: "Rock me Amadeus" });
    openYouTubeVideo({ singer: "lofi", song: "lofi" });
    
    

  
    
    







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
                entry: "speak.greeting",
                on: { SPEAK_COMPLETE: "music" },
              },
              music: {
                entry: "speak.music",
                on: { SPEAK_COMPLETE: "Ask" },
              },
              musicOrQuestion: {
                initial: "Prompt",
                states: {
                  Prompt: {
                    entry: "speak.musicOrQuestionPrompt",
                    on: { SPEAK_COMPLETE: "Ask" },
                  },  
                },
              },    
              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: [
                    {
                      target: "youtube",
                      cond: ({ event }) => {
                        const userInput = event.value[0].utterance.toLowerCase();
                        if (userInput in grammar) {
                          const entities = grammar[userInput].entities;
                          if ("singer" in entities || "song" in entities) {
                            return true; // Return true to transition to "youtube"
                          }
                        }
                        return false;
                      },
                    },
                    {
                      target: "AskAboutSinger",
                      cond: ({ event }) => {
                        const userInput = event.value[0].utterance.toLowerCase();
                        return (
                          userInput.includes("ask") ||
                          userInput.includes("question") ||
                          userInput.includes("singer")
                        );
                      },
                    },
                  ],
                },
              },               
              youtube: {
                entry: "speak.youtube",
                on: { SPEAK_COMPLETE: "youtubevideo" },
              },
              youtubevideo: {
                entry: "openYoutubeVideo",
                on: { SPEAK_COMPLETE: "youtube" },
              },
  
      
      AskAboutSinger: {
        entry: "speak.singerquestion",
        on: {
          SPEAK_COMPLETE: "ListenForSinger",
        },
      },
      ListenForSinger: {
        entry: listen(),
        on: {
          RECOGNISED: [
            {
              target: "AskChatGPTAboutSinger",
              cond: ({ event }) => {
                const userInput = event.value[0].utterance.toLowerCase();
                // Check if the user's input indicates a question about a singer
                return userInput.includes("singer");
              },
            },
            {
              target: "AskChatGPTAboutMusic", // Handle other queries about music here
            },
          ],
        },
      },
      AskChatGPTAboutSinger: {
        invoke: {
          src: fromPromise(async ({ input }) => {
            const data = await fetchFromChatGPT(
              input.lastResult[0].utterance +
                "reply in a json format with entities: singer. If I don't mention any entities, leave it empty.",
              40
            );
            return data;
          }),
          input: ({ context, event }) => ({
            lastResult: context.lastResult,
          }),
          onDone: {
            target: "SayChatGPTResponse",
            actions: [
              ({ event }) => console.log(JSON.parse(event.output)),
              assign({
                singerquestion: ({ event }) => JSON.parse(event.output).singer,
              }),
            ],
          },
        },
      },
      SayChatGPTResponse: {
        entry: say(`Here's what I found about the singer: ${context.singerquestion}.`),
        on: {
          SPEAK_COMPLETE: "ListenForSinger", // Go back to listening for more questions
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
          value: { utterance: "Hello! Welcome to Bruno, your music operator." },
        });
      },
      "speak.music": ({ context }) => 
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Now it's time to say the song, the singer, or the genre you would like to listen to." },
        }),
        
        "speak.youtube": ({ context }) => 
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Please click on the pop-up window to play the music." },
        }),
        
        "speak.singerquestion": ({ context }) => {
          context.spstRef.send({
            type: "SPEAK",
            value: { utterance: "Apparently you want to know more about a singer. Tell me the name so I can provide you with more info" },
          });
          },    
         
     
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
    }, 
  },
  },
); 

const actor = createActor(dmMachine).start();

document.getElementById("button")!.onclick = () => actor.send({ type: "CLICK" });

actor.subscribe((state) => {
  console.log(state.value);
});

