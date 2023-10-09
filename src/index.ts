import { createMachine, createActor, assign,sendTo } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "bda57d3c64774a4d8551a1b09e22dfdc",
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
    const grammar: { [index: string]: { arrivalcity?: string, departurecity?: string, flight?: string} } = {
      'paris':{arrivalcity:'Paris City'},
      'shanghai':{departurecity:'Shanghai City'},
      'economy':{flight:'Economy class'},
      'economy class':{flight:'Economy class'},
      'business':{flight:'Business class'},
      'business class':{flight:'Business class'},

    }
    
    
    
    interface DMContext {
    
      spstRef?: any;
      lastResult?: Hypothesis[];
     
    }
interface slotContext{
  spstRef?:any,
  dcity?:string,
  acity?:string,
  class?:string
}
    function userJudge(event, condition, grammar) {
      let input = event.value[0].utterance.toLowerCase().split(" ");
      console.log(input);
      for (let item of input) {
          if (grammar[item] && grammar[item][condition]) {
              console.log(grammar[item][condition]);
              return grammar[item][condition];
          }
      }
      return false;
  }
    const SlotExtraction = createMachine<slotContext>(
      {
          id: "SlotExtraction",
          context:{dcity:'',acity:'',class:'',spstRef:''},
          initial: "AskDepartureCity",
          states: {
              AskDepartureCity: {
                  initial:'prompt',
                  states:{
                    help: {entry: say('I do not get you'),
            
                    on: {SPEAK_COMPLETE: "hist" } 
                  },
                  hist: {type: "history"},
                  getslot:{
                    entry: listen()
                  },
                  prompt:
                  {
                entry: say("Please provide the departure city."),
                on:{ SPEAK_COMPLETE: 'getslot' },
              }
                },
                  on:{ RECOGNISED: [{
                    target: "AskArrivalCity",
                    guard:({context,event }) => userJudge(event,'departurecity',grammar),
                    actions: [
                      ({ event }) => console.log(event),
                      ({ event }) => console.log(userJudge(event,'departurecity',grammar)),
                      assign({
                        dcity: ({ context,event }) => userJudge(event,'departurecity',grammar),
                      }),
                    ],
                  },
                  {target:'.help'}]
                } ,
                
          
              },
              AskArrivalCity: {
                initial:'prompt',
                states:{
                  help: {entry: say('I do not get you'),
              on: {SPEAK_COMPLETE: "hist" } 
            },
                  hist: {type: "history"},
                  getslot:{
                    entry: listen()
                  },
                  prompt:
                  {
                entry: say("Please provide the arrivalcity."),
                on:{ SPEAK_COMPLETE: 'getslot' },
              }
                },
                on:{ RECOGNISED: [{
                  target: "AskFlightClass",
                  guard:({context,event }) => userJudge(event,'arrivalcity',grammar),
                  actions: [
                    ({ event }) => console.log(event),
                    assign({
                      acity: ({context, event }) => userJudge(event,'arrivalcity',grammar),
                    }),
                  ],
                },
                {target:'.help'}]
              }     
            },
              AskFlightClass: {
                initial:'prompt',
                states:{
                  help: {entry: say('I do not get you'),
              on: {SPEAK_COMPLETE: "hist" } 
            },
                  hist: {type: "history"},
                  getslot:{
                    entry: listen()
                  },
                  prompt:
                  {
                entry: say("Please provide the flight class you need."),
                on:{ SPEAK_COMPLETE: 'getslot' },
              }
                },
                on:{ RECOGNISED: [{
                  target: "Completed",
                  guard:({context,event }) => userJudge(event,'flight',grammar),
                  actions: [
                    ({ event }) => console.log(event),
                    assign({
                      class: ({ context,event }) => userJudge(event,'flight',grammar),
                    })
                    ,
                  ],
                },
                {target:'.help'}]
              }     
            },
              
            Completed: {
              entry: ({ context }) => {
                context.spstRef.send({
                  type: "SPEAK",
                  value: { utterance: `You booked a flight from ${context.dcity} to ${context.acity} with ${context.class}`},
                })
              },
           
             type:'final' 
          }
          }, 
      }
   );    
// machine
const dmMachine = createMachine<DMContext>(
  {
    id: "root",
    type: "parallel",
    context:{spstRef:'',lastResult:[]},
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
              hist: {type: "history"},
              Greeting: {
                entry: "speak.greeting",
                on: { SPEAK_COMPLETE: "HowCanIHelp" },
              },
              HowCanIHelp: {
                entry: say("What can I do for you"),
                on: { SPEAK_COMPLETE: "Ask" },
              },
              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: [{
                    target: "Booking",
                    
                    guard:({context,event }) => event.value[0].utterance.toLowerCase().includes('book'),
                    actions: [
                      ({ event }) => console.log(event),
                    ],
                  },
                  {target:'Repeat',actions: [
                    ({ event }) => console.log(event),
                  ]}],
                },
              },
              Repeat: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: 'I did not understand you' },
                  });
                },
                on: { SPEAK_COMPLETE: "hist" },
              },
              Booking: { initial:'child',
              onDone:'#root.DialogueManager.Prepare',
                states: {
                  
                  child:  {...SlotExtraction.config},
                  
                  
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
          value: { utterance: "Welcome to the booking system" },
        });
      },
      "speak.how-can-I-help": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "How can I help you?" },
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


