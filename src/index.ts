import { createMachine, createActor, assign, fromPromise } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "51a782b6273c4bebb54d1e04b0e108e0",
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  locale: "el-GR",
  asrDefaultNoInputTimeout: 5000,
  ttsDefaultVoice: "el-GR-NestorasNeural",
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

interface Grammar {
  [index: string]: {
    entities: {
      [index: string]: string;
    };
  },
};

const grammar: Grammar = {
  "ναι": {
    entities: {
      help: "yes"
    },
  },
  "όχι": {
    entities: {
      help: "no"
    },
  },
};

const images = ["κουνάβι", "μπανάνα", "βιβλίο", "πεταλούδα", "λεωφορείο", "βόμβα", "σκουληκάκι", "φασόλια", "νυχτερίδα"]

const getItem = (array: any) => {
  const indexRandom = Math.floor(Math.random() * array.length);
  let item = `${array[indexRandom]}`
  return item
};

const lower = (sentence: string) => {
  let u = sentence.toLowerCase().replace(/\.$/g, "");
  return u
}

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
                word: ({ event }) => getItem(images)
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
                entry: ({ context }) => {
                  let count = 0;
                  context.count = count;
                  let arrayOfImages = images;
                  context.arrayOfImages = arrayOfImages;
                  const word = getItem(context.arrayOfImages);
                  context.word = word
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Ας μάθουμε ελληνικά μαζί! Δείξε μου τη λέξη. ${context.word}` },
                  });
                  context.arrayOfImages = context.arrayOfImages.filter((picture: any) => picture !== context.word);
                },
                on: { SPEAK_COMPLETE: "Ask" },
              },
              Ask: {
                entry: ({ context }) => {
                  console.log("ask", context.count, "array ask", context.arrayOfImages)
                },
                on: {
                  SELECTED: [
                    {
                      target: "done",
                      guard: ({ context, event }) => context.word === event.word && context.arrayOfImages.length === 0
                    },
                    {
                      target: "hint",
                      guard: ({ context, event }) => context.count == 2,
                      actions: assign({
                        wrong: ({ event }) => event.word,
                      }),
                    },
                    {
                      target: "true",
                      guard: ({ context, event }) => context.word === event.word,
                      actions: [
                        assign({
                          correct: ({ event }) => event.word,
                        }),
                        ({ event }) => console.log(event),
                      ],
                    },
                    {
                      target: "false",
                      guard: ({ context, event }) => context.word !== event.word,
                      actions: assign({
                        wrong: ({ event }) => event.word,
                      }),
                    },
                  ],
                },
              },
              true: {
                entry: ({ context }) => {
                  const rightAnswer = document.getElementById(`${context.word}`)
                  rightAnswer.style.backgroundColor = "green",
                    setTimeout(() => {
                      rightAnswer.style.backgroundColor = "hsla(126, 32%, 67%, 1)";
                    }, 1000);
                  const word = getItem(context.arrayOfImages);
                  context.word = word
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Σωστά! ${context.word}` },
                  });
                  context.count = 0
                  context.arrayOfImages = context.arrayOfImages.filter((picture: any) => picture !== context.word);
                  console.log(context.arrayOfImages)
                },
                on: { SPEAK_COMPLETE: "Ask" },
              },
              false: {
                entry: ({ context }) => {
                  const wrongAnswer = document.getElementById(`${context.wrong}`)
                  wrongAnswer.style.backgroundColor = "red",
                    setTimeout(() => {
                      wrongAnswer.style.backgroundColor = "hsla(240, 3%, 94%, 1)";
                    }, 1000);
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: `Λάθος! Προσπάθησε ξανά! ${context.word}` },
                    });
                    context.count += 1
                  },
                  on: { SPEAK_COMPLETE: "Ask" },
                },
              hint: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "Θες βοήθεια?" },
                  });
                  context.count = 0
                  console.log("help")
                },
                on: { SPEAK_COMPLETE: "giveHint" },
              },
              giveHint: {
                entry: listen(),
                on: {
                  RECOGNISED: [
                    {
                      target: "yes",
                      guard: ({ context, event }) => {
                        const sent = lower(event.value[0].utterance);
                        if (sent in grammar) {
                          if (grammar[sent].entities.help == "yes") {
                            return true
                          }
                        }
                        return false
                      },
                    },
                    {
                      target: "Ask",
                      guard: ({ context, event }) => {
                        const sent = lower(event.value[0].utterance);
                        if (sent in grammar) {
                          if (grammar[sent].entities.help == "no") {
                            return true
                          }
                        }
                        return false
                      },
                    },
                    {
                      target: "noEntiendo",
                    },
                  ]
                }
              },
              yes: {
                entry: ({ context }) => {
                  const newArray = images.filter((picture: any) => picture !== context.word)
                  const rightAnswer = document.getElementById(`${context.word}`);
                  const wrongPicture = document.getElementById(`${getItem(newArray)}`);
                  wrongPicture.style.backgroundColor = "red";
                  if (wrongPicture !== rightAnswer) {
                    setTimeout(() => {
                      wrongPicture.style.backgroundColor = "hsla(240, 3%, 94%, 1)";
                    }, 2000);
                  }
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Δεν είναι αυτή!` },
                  });
                  context.count = 0
                },
                on: { SPEAK_COMPLETE: "Ask" },
              },
              noEntiendo: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "Συγγνώμη, δεν άκουσα. Πες μου ξανά!" },
                  });
                },
                on: { SPEAK_COMPLETE: "Ask" },
              },
              done: {
                entry: ({ context }) => {
                  const rightAnswer = document.getElementById(`${context.word}`)
                  rightAnswer.style.backgroundColor = "green",
                    setTimeout(() => {
                      rightAnswer.style.backgroundColor = "hsla(126, 32%, 67%, 1)";
                    }, 1000);
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Μπράβο!` },
                  });
                  console.log("done")
                },
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
    actions: {
      prepare: ({ context }) =>
        context.spstRef.send({
          type: "PREPARE",
        }),
      // saveLastResult:
      "speak.greeting": ({ context }) => {
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Γεια!" }, //I am here to help you find your next read! I can recommend you books based on your personal preferences." },
        });
      },
      "speak.how-can-I-help": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "How can I help you?" },
        }),
      "gui.PageLoaded": ({ }) => {
        document.getElementById("button").innerText = "Ξεκίνα!";
      },
      "gui.Inactive": ({ }) => {
        document.getElementById("button").innerText = "Inactive";
      },
      "gui.Idle": ({ }) => {
        document.getElementById("button").innerText = "Περιμένω";
      },
      "gui.Speaking": ({ }) => {
        document.getElementById("button").innerText = "Μιλάω...";
      },
      "gui.Listening": ({ }) => {
        document.getElementById("button").innerText = "Ακούω...";
      },
    },
  },
);

const actor = createActor(dmMachine).start();

document.getElementById("button").onclick = () => actor.send({ type: "CLICK" });
document.getElementById("πεταλούδα").onclick = () => actor.send({ type: "SELECTED", word: "πεταλούδα" });
document.getElementById("κουνάβι").onclick = () => actor.send({ type: "SELECTED", word: "κουνάβι" });
document.getElementById("μπανάνα").onclick = () => actor.send({ type: "SELECTED", word: "μπανάνα" });
document.getElementById("βιβλίο").onclick = () => actor.send({ type: "SELECTED", word: "βιβλίο" });
document.getElementById("λεωφορείο").onclick = () => actor.send({ type: "SELECTED", word: "λεωφορείο" });
document.getElementById("βόμβα").onclick = () => actor.send({ type: "SELECTED", word: "βόμβα" });
document.getElementById("σκουληκάκι").onclick = () => actor.send({ type: "SELECTED", word: "σκουληκάκι" });
document.getElementById("φασόλια").onclick = () => actor.send({ type: "SELECTED", word: "φασόλια" });
document.getElementById("νυχτερίδα").onclick = () => actor.send({ type: "SELECTED", word: "νυχτερίδα" });
actor.subscribe((state) => {
  console.log(state.value);
});

actor.subscribe((state) => {
  console.log(state.value);
});