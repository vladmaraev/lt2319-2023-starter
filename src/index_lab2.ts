import { createMachine, createActor, assign, fromPromise } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "213d2709cc0b4aa7b6511671d9746b97",
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  locale: "en-US",
  asrDefaultNoInputTimeout: 10000,
  ttsDefaultVoice: "en-GB-RyanNeural",
};

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

interface DMContext {
  spstRef?: any;
  lastResult?: Hypothesis[];
  Destination?: string;
  StartingPoint?: string;
  RoutePreference?: string;
  Stopover?: string;
  userInput?: string;
  recognisedData?: any;
  userDialogs?: string[];
}




const grammar = {
  "I want to go to the supermarket": {
    Destination: "supermarket"
  },
  "to school": {
    Destination: "school"
  },
  "from home": {
    StartingPoint: "home"
  },
  "from where I am": {
    StartingPoint: "where you are"
  },
  "stop at the park": {
    Stopover: "park"
  },
  "avoid highways": {
    RoutePreference: "avoid highways"
  },
  "computer": {
    StartingPoint: "Molndal",
    Destination: "Backa",
    RoutePreference: "avoid highways"
  },
  "navigate to Lindholmen": {
    Destination: "Lindholmen"
  },
  "start from Lindholmen to Molndal": {
    StartingPoint: "Lindholmen",
    Destination: "Molndal"
  },
  "drive from Molndal to Backa avoiding highways": {
    StartingPoint: "Molndal",
    Destination: "Backa",
    RoutePreference: "avoid highways"
  },
  "navigate from Backa to Molndal via Lindholmen": {
    StartingPoint: "Backa",
    Destination: "Molndal",
    Stopover: "Lindholmen"
  },
  "from Stockholm to Copenhagen avoiding tolls with a stop in Gothenburg": {
    StartingPoint: "Stockholm",
    Destination: "Copenhagen",
    RoutePreference: "avoid tolls",
    Stopover: "Gothbenrg"
  },
  "I want to go to Linkoping": {
    Destination: "Linkoping"
  },
  "Can you take me to Linkoping?": {
    Destination: "Linkoping"
  },
  "I'll be leaving from Gothenburg to Oslo": {
    StartingPoint: "Gothenburg",
    Destination: "Oslo"
  },
  "from Nordstan to Slottsskogens without using expressways": {
    StartingPoint: " Nordstan",
    Destination: "Slottsskogens",
    RoutePreference: "avoid expressways"
  },
  "I'm driving from Copenhagen to Gotheburg, prefer scenic routes": {
    StartingPoint: "Copenhagen",
    Destination: "Gotheburg",
    RoutePreference: "scenic routes"
  },
  "Go from Gotheburg to Stockholm Dhabi and stop by Linkoping": {
    StartingPoint: "Gotheburg",
    Destination: "Stockholm",
    Stopover: "Linkoping"
  },
  "from Molndal to Backa avoiding highways and passing through Liseberg": {
    StartingPoint: "Molndal",
    Destination: "Backa",
    RoutePreference: "avoid highways",
    Stopover: "Liseberg"
  },
  "I have questions": {
    Questions: "I have questions",
  },
};



// helper functions
const say =
  (text: string) =>
    ({ context, event }) => {
      context.spstRef.send({
        type: "SPEAK",
        value: { utterance: text },
      });
    };

const listen =
  () =>
    ({ context, event }) =>
      context.spstRef.send({
        type: "LISTEN",
      });

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
          Ready: {
            initial: "Greeting",
            states: {
              Greeting: {
                entry: "speak.greeting",
                on: { SPEAK_COMPLETE: "HowCanIHelp" },
              },
              HowCanIHelp: {
                entry: say("You can say where you want to go."),
                on: { SPEAK_COMPLETE: "Start" },
              },
              Start: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: 'AskchatGPT',
                    actions:[
                      assign({
                        lastResult: ({ event }) => event.value,
                      })
                    ],
                  }
                },
              },
              AskchatGPT:{
                invoke: {
                  src: fromPromise(async({input}) => {
                      const data = await fetchFromChatGPT(
                        input.lastResult[0].utterance + "reply in a json format with entities: StartingPoint, Destination, RoutePreference, Stopover.If I don't mention at any entities, leave it as none. Only if I mention where to start, otherwise Staringpoint is the current location",40,
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
                          StartingPoint: ({ event }) => JSON.parse(event.output).StartingPoint, 
                          Destination: ({ event }) => JSON.parse(event.output).Destination,
                          RoutePreference: ({ event }) => JSON.parse(event.output).RoutePreference,
                          Stopover: ({ event }) => JSON.parse(event.output).Stopover, 
                        }),
                      ],
                      target: 'CheckSlots'
                    }
                      }
                    },
              

    
              SayBack: {
                entry: ({ context }) => {
                    context.spstRef.send({
                        type: "SPEAK",
                        value: { utterance: "Great!" },
                    });
                },
                on: { SPEAK_COMPLETE: "FeedbackAndRepeat" },
              },




              CheckSlots: {
                always: [
                  { target: 'AskStartingPoint', guard: 'isStartingPointMissing' },
                  { target: 'AskDestination', guard: 'isDestinationMissing' },
                  { target: 'AskRoutePreference', guard: 'isRoutePreferenceMissing' },
                  { target: 'AskStopover', guard: 'isStopoverMissing' },
                  { target: 'SayBack' },
                ]
                },

           

              AskStartingPoint: {
                entry: say('From where will you start your journey?'),
                on:{ SPEAK_COMPLETE: 'Start' }
              },
           
              
              AskDestination: {
                entry: say('Where would you like to go?'),
                on: { SPEAK_COMPLETE: 'Start' }
              },
              
              AskRoutePreference: {
                entry: say('Do you have any route preferences, like avoiding highways?'),
                on: { SPEAK_COMPLETE: 'Start' }
              },
              
              AskStopover: {
                entry: say('Would you like to have a stopover somewhere? If yes, where?'),
                on: { SPEAK_COMPLETE: 'Start' }
              },
              
              FeedbackAndRepeat: {
                entry: 'navigateFeedback',
                on: {
                  SPEAK_COMPLETE: {actions: "prepare"}
                }
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
    guards: {
      isStartingPointMissing: ({ context }) => !context.StartingPoint,
      isDestinationMissing: ({ context }) => !context.Destination,
      isRoutePreferenceMissing: ({ context }) => !context.RoutePreference,
      isStopoverMissing: ({ context }) => !context.Stopover,
    },
    

    actions: {
      prepare: ({ context }) =>
        context.spstRef.send({
          type: "PREPARE",
        }),
      // saveLastResult:
      "speak.greeting": ({ context }) => {
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Hello Jackie" },
        });
      },
      "speak.how-can-I-help": ({ context }) =>
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
          value: { utterance: `Navigating from ${context.StartingPoint} to ${context.Destination} with preference: ${context.RoutePreference} and stopover at ${context.Stopover}.Have a safe journey` },
        });
      },
    },
  },
);



const actor = createActor(dmMachine).start();

document.getElementById("button").onclick = () => actor.send({ type: "CLICK" });

actor.subscribe((state) => {
  console.log(state.value);
});
