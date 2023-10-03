import { createMachine, createActor, assign, raise } from "xstate";
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
// air-conditioner functions 
interface DMContext {
  spstRef?: any;
  lastResult?: Hypothesis[];
  Mode?: string; // warm or cool
  Switch?: string ; // on or off
  Intensity?: string; // weak, strong, or medium
  Temperature?: string; // high or low 
  Direction?: string; // body,legs or loop (which is the whole car)
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
    [index: string]: {
      intent: string;
      entities: {
        [index: string]: string;
      };
    };
  }

// I changed the grammar a bit, as well as the utterances what is being said by the system 
// it's stark with saying which function one can choose from, and strats then with "Let's start with mode", there one can say "cool", or warm
// then it goes direction there one can say "legs" or "body", for the temperature one can say "high" or "low", and lastly for the intensity
// one can say "strong", "medium", or "weak". 

  const grammar = {
 
    "Legs": {
      Switch: "on",
      Direction: "towards legs",
    },
    "Body": {
      Switch: "on",
      Direction: "towards body",
    },
    "Loop": {
      Switch: "on",
      Direction: "loop",
    },
    "Cool": {
      Switch: "on",
      Mode: "cool",
    },
    "Warm": {
      Switch: "on",
      Mode: "warm",
    },
    "High": {
      Switch: "on",
      Temperature: "high",
    },
    "Low": {
      Switch: "on",
      Temperature: "low",
    },
    "Weak": {
      Switch: "on",
      Intensity:"weak"
    },
    "Medium": {
      Switch: "on",
      Intensity:"medium"
    },
    "Strong": {
      Switch: "on",
      Intensity:"strong"
    },



// here are longer sentences, it always starts with "Mode", so one has to start with an utterance which involves "Mode"

   /* "Cool mode, strong intensity": {
      Switch: "on",
      Mode:"cool",
      Intensity:"strong"
    },
    "Turn the airconditioner off": {
      Switch: "off"
    },
    "Set it to warm mode": {
      Switch: "on",
      Mode: "warm"
    },
    "Turn it to cool mode": {
      Switch: "on",
      Mode: "cool"
    },
    "Turn the intensity to strong":{
      Switch: "on",
      Intensity: "strong"
    },
    "Turn the intensity to low":{
      Switch: "on",
      Intensity: "waek"
    },
    "Turn the intensity to medium":{
      Switch: "on",
      Intensity: "medium"
    },
    "Turn the intensity to high":{
      Switch: "on",
      Intensity: "strong"
    },
    "I want to raise the temperature": {
      Switch: "on",
      Temperature: "increasing"
    }, 
    "I want to lower the temperature": {
      Switch: "on",
      Temperature: "decreasing"
    }, 
    "Point the air-conditioner towards my legs ": { // legs = down
      Switch: "on",  
      Direction: "towards legs"
    },
    "Point the air-conditioner towards my body": { // body = middle 
      Switch: "on", 
      Direction: "middle"
    },
    "Turn the air conditioner on to warm mode with strong intensity": {
      Switch: "on",
      Mode: "warm",
      Intensity: "strong"
    },
    "I feel cold, raise the temperature, and lower the intensity": {
      Switch: "on",
      Temperature: "increasing",
      Mode: "warm",
      Intensity: "weak"
    },
    "Point the air-conditioner towards my body, cool air and medium intensity": {
      Switch: "on",
      Direction: "towards body",
      Mode: "cool",
      Intensity: "medium"
    },
    "Turn the air conditioner off": {
      Switch: "off"
    },
    "Make a loop":{
      Switch: "on",
      Direction: "loop"
    },
    "Point the air-conditioner towards my legs, warm air and high intensity": {
      Switch: "on",
      Direction: "towards legs",
      Mode: "warm",
      Intensity: "strong"
    },
    "I feel hot, lower the temperature, and increase the intensity": {
      Switch: "on",
      Temperature: "decreasing",
      Mode: "cool",
      Intensity: "strong"
    },*/
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
          Ready: {
            initial: "Greeting",
            states: {
              Greeting: {
                entry: "speak.greeting",
                on: { SPEAK_COMPLETE: "help" },
              },
              help: {
                entry: say("You can choose your preferred mode, intensity, temperature, and direction. Let's strat with choosing the mode."),
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
                        Switch: ({ context, event }) => {
                          const userInput = ToLowerCase(event.value[0].utterance);
                          return lowerCaseGrammar[userInput]?.Switch || context.Switch;
                        },
                        Mode: ({ context, event }) => {
                          const userInput = ToLowerCase(event.value[0].utterance);
                          return lowerCaseGrammar[userInput]?.Mode || context.Mode;
                        },
                        Intensity: ({ context, event }) => {
                          const userInput = ToLowerCase(event.value[0].utterance);
                          return lowerCaseGrammar[userInput]?.Intensity || context.Intensity;
                        },
                        Direction: ({ context, event }) => {
                          const userInput = ToLowerCase(event.value[0].utterance);
                          return lowerCaseGrammar[userInput]?.Direction || context.Direction;
                        },
                        Temperature: ({ context, event }) => {
                          const userInput = ToLowerCase(event.value[0].utterance);
                          return lowerCaseGrammar[userInput]?.Temperature || context.Temperature;
                        },
                      }),
                      
                    ],
                    target: 'CheckSlots'
                  }
                  
                },
              },  
              CheckSlots: {
                always: [
                  { target: 'AskMode', guard: 'isModeMissing' },
                  { target: 'AskDirection', guard: 'isDirectionMissing' },
                  { target: 'AskTemperature', guard: 'isTemperatureMissing' },
                  { target: 'AskIntensity', guard: 'isIntensityMissing' },
                  { target: 'AskSwitch', guard: 'isSwitchMissing' },
                  { target: 'FeedbackAndRepeat' }, 
                ]
                },
              AskMode: {
                entry: say('Which Mode would you like?'),
                on:{ SPEAK_COMPLETE: 'Ask' }
              },
              AskDirection: {
                entry: say('Which Direction would you like?'),
                on: { SPEAK_COMPLETE: 'Ask' }
              },
              AskTemperature: {
                entry: say('Which Temperature would you like?'),
                on: { SPEAK_COMPLETE: 'Ask' }
              },
              AskIntensity: {
                entry: say('Which Temperature would you like?'),
                on: { SPEAK_COMPLETE: 'Ask' }
              },
              AskSwitch: {
                entry: say('Switch is on.'),
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
      isModeMissing: ({ context }) => !context.Mode,
      isDirectionMissing: ({ context }) => !context.Direction,
      isTemperatureMissing: ({ context }) => !context.Temperature, 
      isIntensityMissing: ({ context }) => !context.Intensity,
      isSwitchMissing: ({ context }) => !context.Switch,
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
          value: { utterance: "Hello! Welcome to your air-conditioner." },
        });
      },
      "speak.help": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "" },
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
          value: { utterance: `Alright, the air-corditioner is turned ${context.Switch}, on ${context.Mode} mode and on ${context.Intensity} intensity, the temperature is ${context.Temperature}, the direction is ${context.Direction}.` },
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
