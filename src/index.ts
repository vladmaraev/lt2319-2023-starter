import { createMachine, createActor, assign } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "",
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  locale: "pl-PL",
  asrDefaultNoInputTimeout: 5000,
  ttsDefaultVoice: "pl-PL-AgnieszkaNeural",
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

    const colorGenerator = () => {
      const colors = ["niebieski", "czerwony", "żółty", "zielony", "pomarańczowy", "fioletowy", "biały", "czarny", "brązowy"];
      return colors[Math.floor(Math.random() * colors.length)];
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
            on: { ASRTTS_READY: "Form" },
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
          Form: {
            initial: "Prompt",
            states: {
              Prompt: {
                entry: "speak.prompt",
                on: { SPEAK_COMPLETE: "Ask" },
              },
              Ask: {
                entry: ({ context }) => {
                  const color = colorGenerator();
                  context.color = color;
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `${context.color}` },
                  });
                },
                on: { SELECTED: [{
                  target: "Correct",
                  guard: ({ context, event }) => context.color === event.color,
                  actions: assign({
                    correct: ({ event }) => event.color,
                  }),
                },
                {
                  target: "Incorrect",
                  guard: ({ context, event }) => context.color !== event.color,
                  actions: assign({
                    incorrect: ({ event }) => event.color,
                  }),
                },
              ],
              },
            },
            Correct: {
              entry: ({ context }) => {
                const correctButton = document.getElementById(`${context.color}`)
                correctButton.style.backgroundColor = "green",
                setTimeout(() => {
                  correctButton.style.backgroundColor = "hsla(217, 85%, 66%, 0.4)";
                }, 1000);
                context.spstRef.send({
                  type: "SPEAK",
                  value: { utterance: `Zgadza się! Kolejny kolor to` },
                });
              },
              on: { SPEAK_COMPLETE: "Ask" },
            },
            Incorrect: {
              entry: ({ context }) => {
                const wrongButton = document.getElementById(`${context.incorrect}`)
                wrongButton.style.backgroundColor = "red",
                setTimeout(() => {
                  wrongButton.style.backgroundColor = "hsla(217, 85%, 66%, 0.4)";
                }, 1000);
                context.spstRef.send({
                  type: "SPEAK",
                  value: { utterance: `Niestety nie. Spróbuj ponownie` },
                });
              },
              on: { SELECTED: [{
                target: "Correct",
                guard: ({ context, event }) => context.color === event.color,
                actions: assign({
                  correct: ({ event }) => event.color,
                }),
              },
              {
                target: "Incorrect",
                guard: ({ context, event }) => context.color !== event.color,
                actions: assign({
                incorrect: ({ event }) => event.color,
              }),
              }
            ],
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
      "speak.prompt": ({ context }) => {
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Cześć! Zagrajmy w grę. Podam ci kolor, a ty wybierzesz go spośród listy. Gotowy?Zaczynajmy" },
        });
      },
      "gui.PageLoaded": ({}) => {
        document.getElementById("start").innerText = "Naciśnij aby rozpocząć";
      },
      "gui.Inactive": ({}) => {
        document.getElementById("start").innerText = "Nieaktywny";
      },
      "gui.Idle": ({}) => {
        document.getElementById("start").innerText = "Bezczynny";
      },
      "gui.Speaking": ({}) => {
        document.getElementById("start").innerText = "Mówi...";
      },
      "gui.Listening": ({}) => {
        document.getElementById("start").innerText = "Słucha...";
      },
    },
  },
);

const actor = createActor(dmMachine).start();

document.getElementById("start").onclick = () => actor.send({ type: "CLICK" });
document.getElementById("niebieski").onclick = () => actor.send({ type: "SELECTED", color: "niebieski"});
document.getElementById("czerwony").onclick = () =>actor.send({ type: "SELECTED", color: "czerwony"});
document.getElementById("żółty").onclick = () => actor.send({ type: "SELECTED", color: "żółty"});
document.getElementById("zielony").onclick = () => actor.send({ type: "SELECTED", color: "zielony"});
document.getElementById("pomarańczowy").onclick = () => actor.send({ type: "SELECTED", color: "pomarańczowy"});
document.getElementById("fioletowy").onclick = () => actor.send({ type: "SELECTED", color: "fioletowy"});
document.getElementById("biały").onclick = () => actor.send({ type: "SELECTED", color: "biały"});
document.getElementById("czarny").onclick = () => actor.send({ type: "SELECTED", color: "czarny"});
document.getElementById("brązowy").onclick = () => actor.send({ type: "SELECTED", color: "brązowy"});

actor.subscribe((state) => {
  console.log(state.value);
});
