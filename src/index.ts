import { createMachine, createActor, assign, raise } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "eedf2f3616c748c99f0d3266a102a6ba",
};



const settings: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  locale: "en-US",
  asrDefaultNoInputTimeout: 5000,
  ttsDefaultVoice: "en-US-JennyNeural",
};

interface DMContext {
  spstRef?: any;
  lastResult?: Hypothesis[];
  utterance?: any;
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
    intent: string;
    entities: {
      [index: string]: string;
    };
  };
}
const grammar = {
  "put the red book on the table": {
    intent: "None",
    entities: {
    color: "Red",
    what: "Book",
    where: "Table",
    },
  },
  red: {
    intent: "None",
    entities: {color: "Red"},
  },
    // Add more phrases and attributes as needed
};
const getEntity = (context: DMContext, entity: string) => {
  // Ensure that utterance is not empty and contains recognized text
  if (context.utterance) {
    const u = context.utterance.toLowerCase().replace(/\.$/g, "");

    if (u in grammar) {
      const recognizedPhrase = grammar[u];

      if (entity in recognizedPhrase.entities) {
        return recognizedPhrase.entities[entity];
      }
    }
  }

  return false;
};
       

  


// machine
const dmMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QCcD2qAuA6AYgVwBsCB9AJTjwwKwAVkwAHAQ3oGIBBAZVIBUfOyAUXYARAJoBtAAwBdRKAapYASwzLUAO3kgAHogBMAZilYAnAFZDARkP6AHFfN2pAFlMA2ADQgAnoisA7C5YUqFhUu7m+i5W0QC+cd5omLiEJOSwlNTkTBA+WADi9GBqGlCsnDTCANLEAMIA8gCyNAAygjyC0nJIIIoqapraegj2JhbWAZbRhqb6+t5+CO4BJkGmG+ZWUvruDuYJSejY+ERkFFRYOXlY7LAA1qykgo0FAHIAkpyCIt3a-ap1FpeiN3DEsG55lI7PpzAE7A4AotEGCAlgAgFDC4sVYVuY3FZDiBkic0udMpdrvlTiR2BpYAB3MDICpVdi1RotdqdP69AGDYGgUHgyH6aGw+GI5EIKJo8JSRzmfGGBFEkmFACqH1oTBgrVQuUgrDqrQ+dWqvIUSkBQxBBlMaLsK0Clm2G3cVmlCMM6PMoVilkM5g2LjVx012o+GiYAGM1AA3MAcbh8ATPUSSWT-a0C4YGOw+lYeIIRWLRFzS2JWYJi6zufQWLZ2Fx2MMpApa25x5SJrAfCAEJOp4icHjsXg-S19HNAvMIaz6LDNwwBesrpV+uGVzEmezuSL4zYuKSGNvYDva9jd3v9wfJ0gjscT35Zvkz21CxALpfY1dGKZKlIW6+P49bBPCkTHnYARzKYp6JMS4YXl2CZgFgnAMGATD3MoZSsjU9TNG0HRdK+VoDLOdrzrEP4rmuAGbkiIEILiMHok69YwRsDq7GeEYoT2aGtMosAYGAGi4eUzyvJ83wvj05E2oKuhfpYEJzIEKp-pY5iVnCNZOsGBYeHYGytkSGioBAcDaCS2YUR+KkIAAtPoTFLK5oYIeqNLklk9lKXO+iesx7g+m43EWBEQTYvBRwpL5GRZLQ9DMPQAW5lRAQLMxjjjJFpgKliCL7nxiUXNkWF5BllGfsspjStiphYH6YRii27imC4XnxaSZxJZSVX5EUYAlJJNWOSMViBNKYVWEuhiLceuJGPY+hlWSA2Vbk+R3PcE3KSMLaLpYpjTTBfr7seFahS4aJTGELgrM4Uzmb1qT9RVVxDR9tL0kyyAHXOy4hPCeUIjEOmzViWCLUtCprmtfEXkDVHBdKMHuFg8yRPW9jGAihLeUhnY0LqYD6oaECo3V2VegW6K7OYHrwqYBbxMT7adlGsaoTTTnQZWVhndjJ7VhEBIqnFiFc5e15gPzoINbld3NastixKuUgwU6yOdleqF9gOCtvg5h3+DNuVwlj2KRNlwVnRs62c+e+vy+hmHYeNpuBVRWzBC4DarK1VgwtElYrIu6v2L+cwnnrcuG8Jonid7imZXV-sQkHQH+mHN1LI4KyixrONTNiCQJEAA */
    id: "root",
    type: "parallel",
    states: {
      Full_Resutl: {
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
            id: "ready",
            states: {
              Greeting: {
                id: "greeting",
                entry: say("Hi! What would you like me to do?"),
                on: {
                  SPEAK_COMPLETE: "#Ask"
                },
              },
              Ask: {
                id: "Ask",
                entry: listen(),
                on: {
                  RECOGNISED: [
                    {
                      target: "#Full_Answer",
                      guard: ({ context }) => {
                        const isColorPresent = !!getEntity(context, "color");
                        console.log("Is 'color' present:", isColorPresent);
                        return isColorPresent;
                      },
                      actions: assign({
                        color: (context) => getEntity(context, "color"),
                      }),
                    },
                  ],
                },
              },
              Full_Answer: {
                id: "Full_Answer",
                entry: ({ context }) => {
                  console.log("Entering Full_Answer state");
                  context.spstRef.send({
                    type: "SPEAK",
                    value: `Ok, so you want the ${context.color} right?`,
                  });
                },
                on: { SPEAK_COMPLETE: "#greeting" }, 
              },
            },
          },
        },
      },
      
      //Partial_Answer: {
        //initial: "Double_Check",
        //id: "Partial_Answer",
        //states: {
          //Double_Check: {
            //id: "Double_Check",
            //entry: say("I didn't really get it"),
            //on: {SPEAK_COMPLETE: "#Ask_Clarification"},
          //},
          //Ask_Clarification: {
            //id: "Ask_Clarification",
            //entry: listen(),
            //on: {
              //RECOGNISED: [

              //],
            //},
          //},
        //},
      //},
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
      "gui.PageLoaded": ({}) => {
        document.getElementById("button").innerText = "Begin your torture:)";
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