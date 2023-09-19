import { createMachine, createActor, assign } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "ad818b0cdae94e4ea41aec30f7342a73",
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
  // name: any;
}

// creating a grammar for our utterances: 

//what = the meal you want to prepare
//when = the time you want the meal preperation to take or for when would you like the meal, e.g organize a meal for the whole week
//purpose = is there a special occasion or a specific detail? e.g. create a warm meal for rainy days. 

const grammar = {
  //meal prep utterances
  "alfredo, find a recipe that's perfect for a date night tomorrow": {
    what: "recipe",
    when: "tomorrow",
    purpose: "date night",
  },
  "find a recipe that's perfect for date night": {
    what: "recipe",
    when: "",
    purpose: "date night",
  },
  "create a recipe that's perfect for date night": {
    what: "recipe",
    when: "",
    purpose: "date night",
  },
  "can you suggest an international dish for today?": {
    what: "dish",
    when: "today",
    purpose: "international",
  },
  "can you suggest a 1O minutes smoothie for energy boost?": {
    what: "healthy smoothie",
    when: "10 minutes",
    purpose: "energy boost",
  },
  "create a gluten-free and dairy-free meal plan for the week.": {
    what: "weakly plan",
    when: "a week",
    purpose: "gluten-free and dairy-free",
  },
  "create a quick Sunday snack with bananas.": {
    what: "quick snack",
    when: "Sunday",
    purpose: "with bananas",
  },
  "suggest a recipe that's low in carbs and high in protein": {
    what: "recipe",
    when: "",
    purpose: "low in carbs and high in protein",
  },
  "create a health afternoon snack": {
    what: "snack",
    when: "afternoon",
    purpose: "snack",
  },
  "create an italian recipe for tonight": {
    what:"recipe",
    when: "tonight",
    purpose: "italian",
  },
  "create a fun drink": {
    what: "drink",
    when: "",
    purpose: "fun",
  },
  "plan a weekend picnic": {
    entities: {
      what: "picnic",
      when: "weekend",
      purpose: "",
    },
  },

}

const getEntity = (context: DMContext, entity: string) => {
  // lowercase the utterance and remove tailing "."
  let u = context.lastResult[0].utterance.toLowerCase().replace(/\.$/g, "");
  if (u in grammar) {
    if (entity in grammar[u].entities) {
      return grammar[u].entities[entity];}
  }
  return false;
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
                entry: "speak.greeting", //greeting state
                on: { SPEAK_COMPLETE: "GetName" }, //move to ask for name from here 
              },
              //new states for lab 1
              GetName: {
                entry: say("If you don't mind me asking, what shall I call you?"),
                on: { SPEAK_COMPLETE: "AskName" },
              },
              AskName: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "Greet", //change state to say name. "so <name> what can i do for you today?"
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        name: ({event}) => event.value[0].utterance.replace(/\.$/g, ""),
                      }),
                    ],
                  },
                },
              },
              // Ask: {
              //   entry: listen(),
              //   on: {
              //     RECOGNISED: {
              //       target: "Repeat",
              //       actions: [
              //         ({ event }) => console.log(event),
              //         assign({
              //           lastResult: ({ event }) => event.value,
              //         }),
              //       ],
              //     },
              //   },
              // },
              Greet: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Well ${context.name}, what can I do for you today?` },
                  });
                },
                on: { SPEAK_COMPLETE: "AskMeal" },
              },
              AskMeal: {
                entry: listen(),
                on: {
                  RECOGNISED:{
                    target: "okay",
                    guard: ({event}) => getEntity(event.value, "what") && !!getEntity(event.value, "when") && !!getEntity(event.value, "purpose"), //condition here,
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                  },
                },
              },
              okay: {  //test state to be altered
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `perfect!` },
                  });
                },
                on: { SPEAK_COMPLETE: "AskMeal" },
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
          value: { utterance: "Hello and welcome to TasteTraverse. My name is Alfredo and I'm here to help you prepare your desired meal! Think of me as your personal chef." },
        });
      },
      "speak.how-can-I-help": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "How can I help you?" },
        }),
      "gui.PageLoaded": ({}) => {
        document.getElementById("button").innerText = "Click to start!";
        document.querySelector(".animation-speaking").classList.remove("active");
        document.querySelector(".animation-listening").classList.remove("active");
        document.querySelector(".animation-speaking").classList.add("hidden");
        document.querySelector(".animation-listening").classList.add("hidden");
      },
      "gui.Inactive": ({}) => {
        document.getElementById("button").innerText = "Inactive";
        document.querySelector(".animation-speaking").classList.remove("active");
        document.querySelector(".animation-listening").classList.remove("active");
        document.querySelector(".animation-speaking").classList.add("hidden");
        document.querySelector(".animation-listening").classList.add("hidden");
      },
      "gui.Idle": ({}) => {
        document.getElementById("button").innerText = "Idle";
        document.querySelector(".animation-speaking").classList.remove("active");
        document.querySelector(".animation-listening").classList.remove("active");
        document.querySelector(".animation-speaking").classList.add("hidden");
        document.querySelector(".animation-listening").classList.remove("hidden");
      },
      "gui.Speaking": ({}) => {
        document.getElementById("button").innerText = "Speaking...";
        document.getElementById("button").className = "speakWave";
        document.querySelector(".animation-speaking").classList.add("active");
        document.querySelector(".animation-speaking").classList.remove("hidden");
        document.querySelector(".animation-listening").classList.remove("active");
        document.querySelector(".animation-listening").classList.add("hidden");
      },
      "gui.Listening": ({}) => {
        document.getElementById("button").innerText = "Listening...";
        document.getElementById("button").className = "listening";
        document.querySelector(".animation-speaking").classList.remove("active");
        document.querySelector(".animation-speaking").classList.add("hidden");
        document.querySelector(".animation-listening").classList.add("active");
        document.querySelector(".animation-listening").classList.remove("hidden");
      },
    },
  },
);

const actor = createActor(dmMachine).start();

document.getElementById("button").onclick = () => actor.send({ type: "CLICK" });


actor.subscribe((state) => {
  console.log(state.value);
});
