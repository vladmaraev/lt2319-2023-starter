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
  Mode?: string; 
  Switch?: string ; // on or off
  Intensity?: string; // low, high, medium
  Temperature?: string; // increase or decrease
  Direction?: string; // body or 
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

const Grammar: Grammar = {
    off: {
      intent: "turn the air conditioner off",
      Switch: "off",
      entities: { Switch: "off" },
    },
    warm_mode: {
      intent: "set it to warm mode",
      Switch: "on",
      Mode: "warm",
      entities: { Switch: "on", Mode: "warm" },
    },
    cool_mode: {
      intent: "turn it to cool mode",
      Switch: "on",
      Mode: "cool",
      entities: { Switch: "on", Mode: "cool" },
    },
    intensity_high: {
      intent: "turn the intensity to high",
      Switch: "on",
      Intensity: "high",
      entities: { Switch: "on", Intensity: "high" },
    },
    intensity_low: {
      intent: "turn the intensity to low",
      Switch: "on",
      Intensity: "low",
      entities: { Switch: "on", Intensity: "low" },
    },
    intensity_medium: {
      intent: "turn the intensity to medium",
      Switch: "on",
      Intensity: "medium",
      entities: { Switch: "on", Intensity: "medium" },
    },
    raise_temp: {
      intent: "I want to raise the temperature",
      Switch: "on",
      Temperature: "increase",
      entities: { Switch: "on", Temperature: "increase" },
    },
    lower_temp: {
      intent: "I want to lower the temperature",
      Switch: "on",
      Temperature: "decrease",
      entities: { Switch: "on", Temperature: "decrease" },
    },
    air_cond_legs: {
      intent: "point the air-conditioner towards my legs",
      Switch: "on",
      Direction: "down",
      entities: { Switch: "on", Direction: "down" },
    },
    air_cond_body: {
      intent: "point the air-conditioner towards my body",
      Switch: "on",
      Direction: "middle",
      entities: { Switch: "on", Direction: "middle" },
    },
    loop: {
      intent: "make a loop",
      Switch: "on",
      Direction: "middle",
      entities: { Switch: "on", Direction: "middle" },
    },
    air_cond_warm: {
      intent: "turn the air conditioner on to warm mode with high intensity",
      Switch: "on",
      Mode: "warm",
      Intensity: "high",
      entities: { Switch: "on", Mode: "warm", Intensity: "high" },
    },
    raise_temp_intensity: {
      intent: "I feel cold, raise the temperature, and lower the intensity",
      Switch: "on",
      Temperature: "increase",
      Intensity: "low",
      entities: { Switch: "on", Temperature: "increase", Intensity: "low" },
    },
    towards_body_medium_intensity: {
      intent: "point the air-conditioner towards my body, cool air and medium intensity",
      Switch: "on",
      Direction: "body",
      Mode: "cool",
      Intensity: "medium",
      entities: { Switch: "on", Direction: "body", Mode: "cool", Intensity: "medium" },
    },
    air_cond_legs_warm_high_intensity: {
      intent: "point the air-conditioner towards my legs, warm air and high intensity",
      Switch: "on",
      Direction: "legs",
      Mode: "warm",
      Intensity: "high",
      entities: { Switch: "on", Direction: "legs", Mode: "warm", Intensity: "high" },
    },
    air_cond_lower_temp__high_intensity: {
      intent: "I feel hot, lower the temperature, and increase the intensity",
      Switch: "on",
      Temperature: "decrease",
      Mode: "cool",
      Intensity: "high",
      entities: { Switch: "on", Temperature: "decrease", Mode: "cool", Intensity: "high" },
    },
  };

  
   
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
                on: { SPEAK_COMPLETE: "Feel" },
              },
              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                  },
                },
              },
              Feel: {
                entry: "speak.Feel",
                on: { SPEAK_COMPLETE: "Ask_feel" },
              },
              Ask_feel: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "warm_mode",
                    target1: "Repeat",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                  },
                },
              },
              warm_mode: {
                entry: "speak.warm_mode",
                on: { SPEAK_COMPLETE: "Askwarm_mode" },
              },
              Askwarm_mode: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "cool_mode",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                  },
                },
              },
              cool_mode: {
                entry: "speak.cool_mode",
                on: { SPEAK_COMPLETE: "Askcool_mode" },
              },
              Askcool_mode: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "intensity_high",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                  },
                },
              },
              intensity_high: {
                entry: "speak.cool_mode",
                on: { SPEAK_COMPLETE: "Askintensity_high" },
              },
              Askintensity_high: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                  },
                },
              },
              
              Off: {
                entry: "speak.off",
                on: { SPEAK_COMPLETE: "Ask_off" },
              },
              Ask_off: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "Off",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                  },
                },
              },




              Repeat: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: context.lastResult[0].utterance },
                  });
                },
                on: { SPEAK_COMPLETE: "Ask" },
              },



              
              IdleEnd: {},
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
          value: { utterance: "Hello, welcome to your air-conditioner!" },
        });
      },
        "speak.Feel": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "How do you feel today, do you want to turn the air-conditionor on? If yes, on which mode would you like it , on which intensity, and in which direction?" },
        }),
        "speak.warm_mode": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Ok, I set it to warm mode" },
        }),
        "speak.off": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Ok, I will turn it off" },
        }),
        "speak.cool_mode": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Ok, I set it to cool mode" },
        }),
        "speak.intensity_high": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Ok, it is set to high intensity" },
        }),









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