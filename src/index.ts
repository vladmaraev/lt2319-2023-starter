import { createMachine, createActor, assign, raise } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "",
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
  lastResult?: [];
}

const checkAnimalSelection = (context, event) => {
  const selectedAnimal = event.selectedAnimal.toLowerCase();
  const systemChoice = context.systemChoice.toLowerCase();
  
  console.log("Selected Animal:", selectedAnimal);
  console.log("System Choice:", systemChoice);
  
  const isCorrect = selectedAnimal === systemChoice;
  
  console.log("Is Correct?", isCorrect);
  
  return isCorrect;
};

const generateRandomAnimal = () => {
  const animals = ["badger", "elephant", "lion", "giraffe", "zebra", "cat","fox", "dog","mouse"];
  return animals[Math.floor(Math.random() * animals.length)];
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
                entry: "speak.greeting",
                on: { SPEAK_COMPLETE: "GameStart" },
              },
              GameStart: {
                entry: "speak.rules",
                on: { SPEAK_COMPLETE: "AnimalGuess" },
              },
              AnimalGuess: {
                initial: "AwaitingSelection",
                states: {
                  AwaitingSelection: {
                    entry: "speak.selectAnimal",
                    on: {
                      ANIMAL_SELECTED: [
                        {
                          target: "Correct",
                          guard: ({ context, event }) => {
                            const selectedAnimal = event.selectedAnimal.toLowerCase();
                            const systemChoice = context.systemChoice.toLowerCase();
                            return selectedAnimal === systemChoice;
                          },
                        },
                        {
                          target: "Wrong",
                          guard: ({ context, event }) => {
                            const selectedAnimal = event.selectedAnimal.toLowerCase();
                            const systemChoice = context.systemChoice.toLowerCase();
                            return selectedAnimal !== systemChoice;
                          },
                        },
                      ],
                    },
                  },

                  Correct: {
                    entry: "speak.correctAnswer",
                    on: {
                      SPEAK_COMPLETE: "New_Round",
                    },
                  },
                  New_Round:{
                    entry: say("Let's play another round"),
                    on: {SPEAK_COMPLETE:"AwaitingSelection"},
                  },
                  Wrong: {
                    entry: "speak.wrongAnswer",
                    on: {
                      SPEAK_COMPLETE: "Next_Animal",
                    },
                  },

                  Next_Animal: {
                    entry: "prepareNextAnimal",
                    on: {
                      SPEAK_COMPLETE: "AwaitingSelection",
                      NO_MORE_ANIMALS: "#root.DialogueManager.Ready"
                    },
                  }
                },
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
          value: { utterance: "Hello User!" },
        });
      },
      "gui.PageLoaded": ({}) => {
        document.getElementById("button1").innerText = "Click to start playing!";
      },
      "gui.Inactive": ({}) => {
        document.getElementById("button1").innerText = "Inactive";
      },
      "gui.Idle": ({}) => {
        document.getElementById("button1").innerText = "Select!";
      },
      "gui.Speaking": ({}) => {
        document.getElementById("button1").innerText = "Speaking...";
      },
      "gui.Listening": ({}) => {
        document.getElementById("button1").innerText = "Listening...";
      },
      "speak.selectAnimal": ({ context}) => {
        const systemChoice = generateRandomAnimal();
        context.systemChoice = systemChoice;
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: `Please select ${systemChoice}.`},
        });
      },
      "speak.correctAnswer": ({ context}) => {
        const systemChoice = context.systemChoice;
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: `You are correct. It's the ${systemChoice}.`},
        });
      },
      "speak.wrongAnswer": ({ context}) => {
        const systemChoice = context.systemChoice;
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: `Sorry, that's not the ${systemChoice}.`},
        });
      },
      "prepareNextAnimal": ({ context}) => {
        context.spstRef.send({
          type: "SPEAK",
          value: {utterance: `Let's try again.`},
        });
        context.spstRef.send({
          type: "MORE_ANIMALS",
        });
      },
      "speak.rules":({ context }) => {
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Let's play a game. The rules are simple. I think of one of the animals that are listed below and you will have to click on the one that I name. Good luck"},
        });
      },
      evaluateChoice: ({ context, event }) => {
        if (context.lastResult && context.lastResult[0]) {
          const selectedAnimal = event.lastResult[0].utterance.toLowerCase();
          const systemChoice = context.systemChoice.toLowerCase();
      
          if (selectedAnimal === systemChoice) {
            raise({ type: 'Correct' }); // Transition to a 'CORRECT' state
          } else {
            raise({ type: 'Wrong' }); // Transition to a 'WRONG' state
          }
        } else {
          // Handle the case where lastResult is not available
          console.error("No lastResult available in context.");
        }
      },
      
      
    },
    guards: {
      checkAnimalSelection: (context, event) => {
        const selectedAnimal = event.selectedAnimal.toLowerCase();
        const systemChoice = context.systemChoice.toLowerCase();
        
        console.log("Selected Animal:", selectedAnimal);
        console.log("System Choice:", systemChoice);
        
        const isCorrect = selectedAnimal === systemChoice;
        
        console.log("Is Correct?", isCorrect);
        
        return isCorrect;
      },
    },
  },
);

const actor = createActor(dmMachine).start();

const handleAnimalClick = (animalName) => {
  actor.send({ type: "ANIMAL_SELECTED", selectedAnimal: animalName});
};

document.getElementById("button1").onclick = () => actor.send({ type: "CLICK" });
document.getElementById("button2").onclick = () => handleAnimalClick("badger");
document.getElementById("button3").onclick = () => handleAnimalClick("elephant");
document.getElementById("button4").onclick = () => handleAnimalClick("lion");
document.getElementById("button5").onclick = () => handleAnimalClick("giraffe" );
document.getElementById("button6").onclick = () => handleAnimalClick("zebra");
document.getElementById("button7").onclick = () => handleAnimalClick("cat");
document.getElementById("button8").onclick = () => handleAnimalClick("fox");
document.getElementById("button9").onclick = () => handleAnimalClick("dog");
document.getElementById("button10").onclick = () => handleAnimalClick("mouse");

actor.subscribe((state) => {
  console.log(state.value);

});



