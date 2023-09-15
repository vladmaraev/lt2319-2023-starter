import { createMachine, createActor, assign } from "xstate";
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
  asrDefaultNoInputTimeout: 5000,
  ttsDefaultVoice: "en-GB-RyanNeural",
};

interface DMContext {
  spstRef?: any;
  lastResult?: Hypothesis[];
  Destination?: string;
  StartingPoint?: string;
  RoutePreference?: string;
  Stopover?: string;
  userInput?: string;
  recognisedData?: any;
}




const grammar = {
  "I want to go to supermarket": {
    Destination: "supermarket"
  },
  "to school": {
    Destination: "school"
  },
  "from home": {
    StartingPoint: "home"
  },
  "from where I am ": {
    StartingPoint: "where you are"
  },
  "stop at park": {
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
                on: { SPEAK_COMPLETE: "Ask" },
              },
              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        userInput: ({ event }) => event.value[0].utterance,
                        Destination: ({ context, event }) => {
                          const userInput = ToLowerCase(event.value[0].utterance);
                          return lowerCaseGrammar[userInput]?.Destination || context.Destination;
                        },
                        StartingPoint: ({ context, event }) => {
                          const userInput = ToLowerCase(event.value[0].utterance);
                          return lowerCaseGrammar[userInput]?.StartingPoint || context.StartingPoint;
                        },
                        RoutePreference: ({ context, event }) => {
                          const userInput = ToLowerCase(event.value[0].utterance);
                          return lowerCaseGrammar[userInput]?.RoutePreference || context.RoutePreference;
                        },
                        Stopover: ({ context, event }) => {
                          const userInput = ToLowerCase(event.value[0].utterance);
                          return lowerCaseGrammar[userInput]?.Stopover || context.Stopover;
                        },
                      }),
                      
                    ],
                    target: 'CheckSlots'
                  }
                  
                },
              },  
              CheckSlots: {
                always: [
                  { target: 'AskStartingPoint', guard: 'isStartingPointMissing' },
                  { target: 'AskDestination', guard: 'isDestinationMissing' },
                  { target: 'AskRoutePreference', guard: 'isRoutePreferenceMissing' },
                  { target: 'AskStopover', guard: 'isStopoverMissing' },
                  { target: 'FeedbackAndRepeat' }, // 如果用户提供了完整信息，仍然进入反馈状态
                ]
                },
              AskStartingPoint: {
                entry: say('From where will you start your journey?'),
                on:{ SPEAK_COMPLETE: 'Ask' }
              },
              AskDestination: {
                entry: say('Where would you like to go?'),
                on: { SPEAK_COMPLETE: 'Ask' }
              },
              AskRoutePreference: {
                entry: say('Do you have any route preferences, like avoiding highways?'),
                on: { SPEAK_COMPLETE: 'Ask' }
              },
              AskStopover: {
                entry: say('Would you like to have a stopover somewhere? If yes, where?'),
                on: { SPEAK_COMPLETE: 'Ask' }
              },
              FeedbackAndRepeat: {
                entry: 'navigateFeedback',
                on: {
                  SPEAK_COMPLETE: {actions: "prepare"}
                }
              },
            }
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
          value: { utterance: `Ok! Navigating from ${context.StartingPoint} to ${context.Destination} with preference: ${context.RoutePreference} and stopover at ${context.Stopover}.Have a safe journey` },
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
