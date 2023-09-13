import { createMachine, createActor, assign } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "7acaf819fba24847b9cc341042eea53e",
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
const extractEntities = (utterance) => {
  const entities = {
    person: null,
    day: null,
    time: null,
  };

  const words = utterance.split(' ');

  words.forEach((word, index) => {
    if (word === "with" && words[index + 1]) {
      entities.person = words[index + 1];
    }
    if (["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].includes(word)) {
      entities.day = word;
    }
    if (["noon", "morning", "evening", "night"].includes(word)) {
      entities.time = word;
    }
  });

  return entities;
};
    
// machine
const dmMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QCcD2qAuA6AIgSwEMAbVKAVzAFkCA7AmZLABWTAAcDWBiAQQGUASgBUhfAPoCAojxwBNANoAGALqJQbVLDwY8qGmpAAPRACYAzIqwAOK4pPmA7AFYXVswE4zAGhABPRACMDmbWVp5mZk4AbAGKZgAsik4Avsk+aJi4hCTkVLT0YIwCYAQQvlgA4qxgOjRQXHxM0gDSYgDCAPKUTAAykkKSSqpIIBpaOnoGxggR8VgO8QsmiopR9vHxAU4+-ghR7g5Y7k6K8e7xZlG2a-Gp6ejY+MSkFNR0DFjFpeUAEqgA7m1aABJH5gIhsBpNHitTrdPoDIYGMbaXT6EbTfZzJwBCxXeK2Byndw7RD7Q7HYkXK6rEy3NIgDKPbIvPLvQqfEplLA8WAAay4Uk6FQAcsC+JIcEiRiiJujQNNgk4sAEovF7O5VVEoit4qSEE4TFEsEarAFNYp3CY3Is7oyHllnrk3gUilzysU2CUMFCWu0ur1+oMVMjNKjJhiyecsDi8VYCYoiWd9WqrCqzA53FYiREM3amZUAKrA5gFHqoUqQLhtHrAtrNaXqMNyqamA7zM32OzLMxbYL69yW6w4i4BWIBKxrKz5h0VYtYYF0ADGOgAbmBeIIROIpDIFCGZc20a2ENaQjrVXFrdqnGYTPqAuZ3FhIopzY+xx4nA4Z5k5yWeBXPB1wXCAiA3bcxD4IQeGESVG1GI8IwVRBexMeYrhMAJ1QuDMggfZw5mWXE1WCExKR-BkC3-HkgJA4EwI3fgBCgmC4KlA8m3GY9IxmR8MKsLCcIiBx8L8QJUyON8wgWaJbFVX9sBowC1zALA+C9Ag+TwOpfRhf14SDBDZR4lC+PQhxMOwukRLE3YglOF8bCsb8PEEpxpyo2d5xU4C1J6PBYAwMAaB0+ohQ6UVxXgzjEO45CjFQ28sE2K07ENTUDm8cSEC2dxn0UMIPDfexYk8VIGRoVAIDgAwmVDeL5UShAAFoTAcfU2rmFYet6vrKPuTInhyV58gYBrwya6YsJTEI73IsdbySKIRPpQbmSdUb2UYFh2E4MAJpbXiHHvHKtksNUPIiNwYl7R9FMdEa2VdTlvkO0zmv2fULjTc5by2RYwkNKIHuG1kXQ+L5uSqMAajC96EumMcOpyqIFnmVYs2WE67zHUGWWdMaOSh34ASBGhQXBNgEamxBb2VFbrQ2E6cRm1H0aJfZBMTcwsICfHNueyH3R5fkaZPQdlTc79PGpVUUd2aJ0OzQSJyiQ0PAG+0hoJraXpJzlNIwcXeKWrBGb+hbBPjfUXHQ6knGOCcsJidwBaeiHiZFhjwMkGgIBNszVTmGxNkSdx9nNM0FbJVUTSCdUM3iFbs35ry-2LQPmrZ3ZBPQlZ1dxfL4wjkwHpopgywrGqA8PRqTxOgchzvcJPHIuxbXTpT50XAg6IOuvJpPbMHxdlVVjRsItnVjZy58-us8xEkzpOOZEjWWJ42d8qu6LAD+9A8DF8COyJJWI5ImCBZTi7Nbte7-fVPUzTtLqY+DVxc3bxTwcbhch9yRYDsJOdWiZL7mDno-PyWAApBRCvDQeR0zKxi-pcMwYRaQEm2CvTU8wFoRGwsEA4FVkhAA */
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
                on: { SPEAK_COMPLETE: [{ target: "HowCanIHelp",
                actions: assign({person: null, day:null, time:null })},
              ] },
              },
              HowCanIHelp: {

                entry: say("Who would you like to have a meeting with?"),
                on: { SPEAK_COMPLETE: "Ask" },
              },
              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "Repeat",
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
                  const entities = extractEntities(context.lastResult[0].utterance);

                  
                  
                  // Update context with extracted entities
                  context.person = entities.person || context.person;
                  context.day = entities.day || context.day;
                  context.time = entities.time || context.time;


                  console.log(context.person, context.day, context.time);
              
                  // Decide what to prompt based on missing information
                  if (!context.person) {
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: "Who are you meeting with?" },
                    });
                  } else if (!context.day) {
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: "On which day?" },
                    });
                  } else if (!context.time) {
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: "At what time?" },
                    });
                  } else {
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: "Meeting scheduled!" },
                    });
                  }
                },
                on: { SPEAK_COMPLETE: [
                  {
                    target:"Greeting",
                    guard: ({ context })=> context.person && context.day && context.time
                  },
                  {target:"Ask",
                  },
]
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
          value: { utterance: "Hello user!" },
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
