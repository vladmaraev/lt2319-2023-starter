import { fromPromise, createMachine, createActor, assign } from "xstate";
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
  asrDefaultNoInputTimeout: 10000,
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

    let animationInterval; 

    let repeatingInterval_taste;
    let repeatingInterval_kind;
    let repeatingInterval_alc;
    let repeatingInterval_info;
    let repeatingInterval_beer;
    let repeatingInterval_final;


    function animateFaceBasedOnSegment(segment) {
      // Check segment content and adjust animation speed

      // First method of dynamically lipsyncing with absolute values
      let speed;
      if (segment === ',') {
          speed = 300; // Slower for comma
      } else if (segment === ';') {
          speed = 500; // Even slower for semicolon
      } else if (['.', '!', '?'].includes(segment)) {
          speed = 700; // Much slower for terminal punctuation
      } else {
          speed = 100; // Base speed for words
      }
  
      return new Promise<void>((resolve) => {
        let leftEye = document.getElementById('left-eye');
        let rightEye = document.getElementById('right-eye');
        let mouthTop = document.getElementById('mouth-top');
        let mouthBottom = document.getElementById('mouth-bottom');
      
        // Checking if SVG elements are correctly fetched
        if (!leftEye || !rightEye || !mouthTop || !mouthBottom) {
          console.error("SVG elements not found. Check if they exist in the DOM with the correct IDs");
          return; 
        }

        leftEye.setAttribute('cx', '70');
        leftEye.setAttribute('cy', '80');
        leftEye.setAttribute('r', '16');
        
        rightEye.setAttribute('cx', '130');
        rightEye.setAttribute('cy', '80');
        rightEye.setAttribute('r', '13');

          let isMouthOpen = false;
          const animationInterval = setInterval(() => {
              if (isMouthOpen) {
                  mouthTop.setAttribute('d', 'M 60,140 L 140,140');
                  mouthBottom.setAttribute('d', 'M 60,140 L 140,140');
              } else {
                mouthTop.setAttribute('d', 'M 60,145 Q 100,125 140,145');
                mouthBottom.setAttribute('d', 'M 60,145 Q 100,165 140,145');
                
                mouthTop.style.fill = '#fff';
                mouthBottom.style.fill = '#fff';
              }
              isMouthOpen = !isMouthOpen;
          }, speed);
  
          // Stop this animation segment after double its speed (to ensure both open and close happen)
          setTimeout(() => {
              clearInterval(animationInterval);
              resolve();
          }, speed * 2);
      });
  }
  
  async function animateFaceBasedOnUtterance(utterance) {
      // Split utterance into segments based on spaces and punctuation
      let mouthTop = document.getElementById('mouth-top');
      let mouthBottom = document.getElementById('mouth-bottom');
      const segments = utterance.split(/([,;.!?]|\s+)/).filter(segment => segment.trim() !== '');
  
      for (const segment of segments) {
          await animateFaceBasedOnSegment(segment);
      }
      console.log("Resseting to neutral")
      // Reset to neutral face at the end
      mouthTop.setAttribute('d', 'M 60,138 Q 100,155 140,138');
      mouthBottom.setAttribute('d', 'M 60,138 Q 100,155 140,138');

      mouthTop.style.fill = '#fff0';
      mouthBottom.style.fill = '#fff0';
  }




    function animateFaceBasedOnHarcoded(utterance) {
      console.log("Function animateFaceBasedOnUtterance called with utterance:", utterance);




      let leftEye = document.getElementById('left-eye');
      let rightEye = document.getElementById('right-eye');
      let mouthTop = document.getElementById('mouth-top');
      let mouthBottom = document.getElementById('mouth-bottom');
    
      // Checking if SVG elements are correctly fetched
      if (!leftEye || !rightEye || !mouthTop || !mouthBottom) {
        console.error("SVG elements not found. Check if they exist in the DOM with the correct IDs");
        return; 
      }

        // Clear any existing animation interval
      if (animationInterval) {
        clearInterval(animationInterval);
      }
    
      if (utterance.includes('Hmm...')) {
        console.log("Utterance contains 'Hmm...'");
        // Adjust animation for "Hmm..."

        leftEye.setAttribute('cx', '80');
        leftEye.setAttribute('cy', '66');
        leftEye.setAttribute('r', '19');
        
        rightEye.setAttribute('cx', '136');
        rightEye.setAttribute('cy', '74');
        rightEye.setAttribute('r', '18');
        
        mouthTop.setAttribute('d', 'M 80,140 Q 130,150 120,150'); 
        mouthBottom.setAttribute('d', 'M 80,140 Q 130,150 120,150');

      } else if (utterance.includes('Let me think...')) {
        console.log("Utterance contains 'Let me think...'");
    

    
        // Set initial animation position for the eyes
        leftEye.setAttribute('cx', '80');
        leftEye.setAttribute('cy', '66');
        leftEye.setAttribute('r', '19');
        
        rightEye.setAttribute('cx', '136');
        rightEye.setAttribute('cy', '74');
        rightEye.setAttribute('r', '18');



                // Count specific punctuation marks
        let commas = (utterance.match(/,/g) || []).length;
        let semicolons = (utterance.match(/;/g) || []).length;
        let periods = (utterance.match(/\./g) || []).length;

        // Base speed
        let speed = 200;

        // The other method of dynamically lipsyncing with relative values
        if (commas > 0) {
            speed += 50; // Slightly slower for commas
        }
        if (semicolons > 0) {
            speed += 100; // Even slower for semicolons
        }
        if (periods > 0) {
            speed += 150; // Much slower for periods
        }

        let isMouthOpen = false;
        animationInterval = setInterval(() => {
          if (isMouthOpen) {
            mouthTop.setAttribute('d', 'M 60,140 L 140,140');
            mouthBottom.setAttribute('d', 'M 60,140 L 140,140');
          } else {
            mouthTop.setAttribute('d', 'M 60,145 Q 100,125 140,145');
            mouthBottom.setAttribute('d', 'M 60,145 Q 100,165 140,145');
            
            mouthTop.style.fill = '#fff';
            mouthBottom.style.fill = '#fff';
          }
          isMouthOpen = !isMouthOpen;
        }, speed);  // Adjusted speed based on punctuation

        // Calculate the utterance duration
        let utteranceDuration = utterance.length * 82;  //multiplier set after trial and error

        setTimeout(() => {
          clearInterval(animationInterval);
          // Set mouth to static position after the animation is over
          mouthTop.setAttribute('d', 'M 60,138 Q 100,155 140,138');
          mouthBottom.setAttribute('d', 'M 60,138 Q 100,155 140,138');
        
          mouthTop.style.fill = '#fff0';
          mouthBottom.style.fill = '#fff0';

      }, utteranceDuration);
  }

      }

    
    // defining the slots
const extractEntities = (utterance) => {
  const entities = {
    kind: null,
    taste: null,
    alc: null,
  };

  const words = utterance.split(/[\s.,;:!?]+/);

  // hardcoding the slot detection criteria
  words.forEach((word, index) => {
    if (["ipa", "lager", "ale", "pilsner", "dark", "white", "brown", "porter", 'stout'].includes(word)) {
      entities.kind = word;
    }
    if (["sour", "sweet", "bready", "bitter", "fruity", "coffee", "chocolate", "chocolatey"].includes(word)) {
      entities.taste = word;
    }
    if (["strong", "weak", "average","medium","low", "high","normal"].includes(word)) {
      entities.alc = word;
    }
  });

  return entities;
};






async function fetchFromChatGPT(prompt: string, max_tokens: number) {
  const myHeaders = new Headers();
  myHeaders.append(
    "Authorization",
    "Bearer ",  
  );
  myHeaders.append("Content-Type", "application/json");

  const customInstruction = "You are a Cicerone, please talk only about beer and beer related facts while steering the conversation towards the subject of beer";
  
  const raw = JSON.stringify({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: customInstruction,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0,
    max_tokens: max_tokens,
  });

  const response = fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  })
    .then((response) => response.json())
    .then((response) => response.choices[0].message.content);

  return response;
}


// machine
const dmMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QCcD2qAuA6AIgSwEMAbVKAVzAFkCA7AmZLABWTAAcDWBiAQQGUASgBUhfAPoCAojxwBNANoAGALqJQbVLDwY8qGmpAAPRACYAzIqwAOK4pOKAnGasBGJ1YcAaEAE9ELgHYzaw8zF1sAVhcAFgCHAF947zRMXEIScipaejBGATACCB8sAHFWMB0aKC4+JmkAaTEAYQB5SiYAGUkhSSVVJBANLR09A2MEMwjorADY6OiHADYHRSCzAO8-BGjFRenFCJtzIIippcTk9Gx8YlIKajoGLHzC4p5YAGsxOgBbMC4pK0SgA5ACSfEkOD6BiG2l0+gG4wCMSwURMDgCixcZhM4TMm0QOwilgCUQiTmJrmiJguIBS13Sdyyj1yzwKRSwAAlUAB3Jq0UGcsBENg1Oo8RqtdpdHrQgawkYI0DjFyKMzBRYmAIBEzUlxucwuAnbRRWRYzWzYzUmRZmaJWWn0tK3TIPHJ5dnFABiZGQGAAFrkxKCaABHMh4ZA+MUNZptTrdXoqGGaOGjRH+RwRLD2dHIlzmZa643zMJYU2LRaOPb5hJJOlXZ0Ze7ZJ4vDlCkX5NgFDAxiVx6WJuXqVOKsaIBy4nMHaKLQ4uCI4xZWEtL83OcmTIJmqaOxs3ZvM91s15Yd4fAGSIFgiFQ5PysfwicIKwbXyEiLmhzRJfYoIBFYhz7qkh5Mm6baemyPYENgADGgZwR8eBVFwI6DE+6bKogOKWDYdiOM4bjOF4H6voo0w-pWqo-oc5IgQyLotiyHpnt2vZYAhYBISh1TyC4-SjsMz4ZhMFghAR7jER4xrYisWArpMtrYlMVjOAxTbga2rLtsU7GwZxiHIah8gmIJGHCVhRg4TsEn2FJ7ikVsuJfgpgFYg4hyzEuGlga62msRy+nwUZvFoWY5kKiJ2EIDE1JYOqZpqlYJgRHE5KybY0zzgWuJLClxI0vWTp+cxJ66dBHEAGYVAhvFiMZEBYBAsEEA1KEQGIXq1f6vFYCQhRhRAehgFgKEAG6oB8o0lYy-ksaeQXsNVPX1Y1zWte1NCdd1GB1VU-WoINVQIBNqBwbB8J9OhUVWSqijYlgU7Ijai5qXsJiyQ9li7LqmqAQ4MSpb5c1lZBbHLQZNV7b1VRbU1LUYG1jVdatB0DRAYW5GgjBsEQsFVagyA-Fgs1Mce4NLTB2DQ-tUDwxtSPw6jMN9RjvGnTQk0XYq10PkJaZKtZsXRDiCXOFWzipelTn+IEVgJYoqzzFMFi-hEIPkxBOlQcFWC07D9PrWQGAYLktBwWAwVrR1pOQ5UfH8xZgsvss2UpcucR4jJZEODYOZYpW72iyuRWXKBoMUzrEPU-raNG7bJtm8gFtW-bNvbXb1NhYYsBI2bWAEFVycABQWErACUXBk0e2uBXp9tx6zcPG6b5s0Jb1st7brDZ1UN2YUL4wLNmqURLiStfqSb6LMaNgOG54TInEpqpXW4eMbXAWLQ3sewAQPjw-2krxjKSaRYPL4xGLiWSwVMtffMqJviYNqJQEBwBJrW8LRVesG-VJGedRqIzakAs2LM6aHWOtUYaNBRpnWmqTA8kc6470qlDeOYhwEgM2jgyBhtoGYxOmdHmV0VAD0skPTMmIsC-jCEBVYVZSSfTIouTy5Y0pRCnNEfU+ozDfy0r-XWjcAFwxwYzMBBBgEELZkdYh1RsZEywHjAmRMSY1yEeVERscxH0wkaA7B0iIG7SgezEhXNzqXT0HzC+VCr7zBMOLJKUs0qeVlrFKsCszB7FsEEHYWpZiCPmtomOK1m76OMaNJO7dO7p3EVErOvYwqUJdqJUkAQZxqSAh-TyERZJpWCKlSsLC-a2i1MEsG0cqbhLpkY4BWAYkpw7mnPukSGm92SahXO+dRpF1LpMSu1cUFa23n-URWCJFNNTl3dpBdOmXX7k7W61CECnCcUsSYDgMQ2HJEuWScwFKVmUlaL8K5KlR3rhg7A+9D44OPoOBMsplmX1EjEd8Wxy7mm+i9CiqVqQOmKiMn+oSamYIiWIYgcFJGQqIHBWR6N5FDRGmNSxSDNEhMprvWphtYXQsMVChFUAiEc1IdYmgtiUz2LeasYIz1TTOAepiakxpUqLiempHxmJHB2DDg2COozhFhPBXUqFMLCWmMIeYxRyAcYqPxhgQmxNkECpBVi65TdRVwvFXColJKLHc3JZSx81KYrXycbfZK0t3GsvWNMLZlZHI7HVBctB4zdFYLFdMlpsy8VJMWY7OxaSYqkndq-KwpZx4kVtWYBebKlxcp2S6oFqqtHqv-p67V3q4ltL9Qsh2XAemwT6cXXIZdiSKCrhiqpVyM0Qq9W3ZpOaun0zFfm3iqTxyiS-Bs205IdlAU8viMir9bLURXNPICSlXVjJ0RxW5eKHlSieefKlwbhYFg+Thec2YnCAx2LaO1gKN6aUxdU4oIZCYEMkZKuRMCuBwIQWimawK03nqwJe1A17QG3sRTAzmhreYUJeaa4WLkikVu4UrHYHj7CrFRLiVUQQlYYlFjOoVHJP3ftar+4l0quBKNxgqpVGjX1nquVhyVN7476qgABqxQHlCduimBxcEHJ5uGg44VlgRMlvzCAsakexojodBRemgV6qPZtaS2-1BbmN3X8GpfYs43EHq8rJP2fHdTmBnrGxYmJRPqsoz1RpjaZnxOJe27pedi2F1LcgEuFbK3DNTeR9BJmYZmeThZtpcmO0gfXSqSs0w9TbOpDiX8rCtjhH9raUWsb7Qf3WMe-lm831XJYHAMANAHZiAAEJgFyEu0+w5AtdpirqHUdC1SAR2AcTU0RWV-PLL+D2Lgg6vyM++i8BWivICvDecEkIFOrJMGpJxHWnCqnmB-ACzXdjlkCOEGI2J7CVm61cwrQZP0wpQpJmj+HH2osmuisjNb0HbeQMGCTqA9u3b1dK+jZCbHAaDRV4WyIFbjZWLsbUWVAjGnVK-Ohc5TjbJXPqdeaXT0XYqldm7hN7sHYibRgjsrlGqMVeolV6X3Pw-64ju7hj9tftw7R57Rq3tro+0icIOYPBKwM4BCigOyJ2icOWDEGJdhhA-hGzbl3Ce7ek760n-mTLlZY+MWNC8KLUmVvqKItot1iTVJwjwosedBD2ILgnO3bvediTJgNYhxfWeqEWgu-Sy31Zc9Wy5QuDdI9F5Zs3huLejZfLmIH9hQsrm2TYeYpo9dQQXaTkrQ5nnvel5mXUCkvxuE1FEWIqv1T2joZWckjgh0+JEymvHcOoKUCJmAK7keV1e7eTsULpo6srExMiJr7P1guCwEvFYdozQqVD2eL0KFiB9eK4CFoIJhv3hj4phA6I8K2HskRdwb41y-msNqNw7jx6A17xyfvdAiBD+u5+h9KLEEvrc0XvvA-98I8-ZTxjVfKu7G8dqOwkxbCA12CWfTClEMMPCD+VLB3N1KCXfQfG-W7dHOVLHEjXHWHR3CqUA6-YXW7O-chJjKXKfLEbMO0LxIPNKG0NcU0GYcIckNSGINUbfb0K-A-InCvM+B-YWLAhKOcU0PAnUWeMiOcencbT+UkA4XTSgrARAmgo-WoWMZdeggSGnWPBAJgnA1giNfAjgrYUsNvCsNEFWZYaHJ0EoAAVVBGYByA6HkUgC4CaA6FBCaHqAYPGDzAtALEkntFOGUMJFsAViAgM1WAOB-BDwL1KH0I-ToDgh0HGn+H4GEFEAkGkDkBsNMDUgUgen7RSgAgemNCiGcASlOBDhtDNF4Q0j0IMJ4GCLwFCI-QgCIH+BEHED4CEB4GEBGwwNWTCCcUxGSKcHRDoh-DSPnCKV2GJE1FtAxD5R0ICKKJCNGlBHKLCMEDEBqLqJ6An2kKn2aJmFDjiBxE8kHWby2CyMyQbzkntDfEMz8IKPPGKNKL4BgmMmqDEIHAkLK0nyaILFWLaI2M6O2MQC-HV0SwOESk8jiHyNGPONGg6DwGARoDChHzHzvFiImCXDoQNFtEcFsC0LSIWAVkcDnDNCxFFgF1pBoFQAgDgAMHpCWNWQAFo0pjRyTzAnptltkLBlhdkKk-DSpLkySXxySPFbQEpX4pw-kzQZ8NZWTUFt4ssOBWAOT0lot-BiQFI2t1Rnpr51hKCpSYpY0gdlgf9dQlZzAnBRYv4RTBUxNShygHY1SN11gSxedUQfEDNnpyRYhBDetfgwALTxhThsxylMQDNCp5gjROCbT1xrRp5YtBDuQ+QBROw2B3TEA3xphZhSQYgUpA9RZrSeTgzX5QybBBCfQ-RAxD8wwIwoxYyEApwF5wsDNAh1sHoPjtgdhMkI0whx5lgqzADzt4CoJozgpSzMQLVUpikEtnBVxOD0j29qRuFYg3BsRnTPhSzsRFtWDYgPBwg+iZTthdRQtkRY1pytlBCeyTUgs5Y6z-oZg1RsQCxPJxsBEjS1V309YuIeIqh5zNQeMDhURtlwhmdBjzB9yJkIVGpSzZccx1lVQGtp5MRjRkRsw7AqxZsnA4ggg-yPUALbZDEUZcNSzZsQLx4wKp4vIXDYpP4asjhatfo1JkKcUM4EZNoMLDskVnzDzadCQOEx4J5wKCLZI4oZg+db591xtKKRVcVW4fMfU3dAKmKZDsK2K8LfSZ4547BmCPBDh0RDRFxBKaYsERLjdfV1oLdSyE0cw9SQsUymFjQyknoDRVhOivwNLNVhLE5zMxLc11o85UA2BZleyPByxkt7QYgVhXARytgLLAYpw0pVQ7TVg7KF0JKBZmLYpFxsDHSl5Wdfwvppw7RW9xsP4phTg7K9F6kzYsLXJNl+1AJB19k2Fy5yx7AAdY0lx2zz9OzhVNKIUDE8EokiUDKKIno+1tlyq9lh0YsPoatnBWjX5yQkLbyMt0E606l2qmZ8FydpUDLx5eqtkB1BrZIdQF52CV4cQ+EOt8rJlElXdc0cFurKI+rNqh1ZIxrmDW9MRGUWzjq2rTqnLm1TcJF9LJKp8txmCodTQmEqQClkRLLeF5xdSyRGrC9mqwVWr5r3rRLPq8sJE3KPLLNSygI29yQ9gvCSknBQa29+K8b1gwroqD5Cq3TfrVkCwMiFSfxSwclZIqwNwxrlgcQ2VfxXqtU4IsLKx1qyrdlbqR1dhvk3oqxyRFworpr8c50hL6oxUCVdVMKaaXwU9Bb+rhbKrnIdhvEtNJh7A7VDST02TgCWr7LFbtVlb4VlqGKoADLNRNabqdbTAR4ZhcRfEP5X4sCebcUG1kaTc8soUDKURSqtaKqhrTA2NnFtQYNdSjrZaL94bLa4YA6dK3c21Ma1bu0MQfKqQmV+DDgY09ieVzBnA7TFg-arboUzqW0-V0bPKc6YoI05dktP4eFAqS6npHBcpeEG9hTTbRSMNsUDIF0Q7m6N1R1WtqQdQ-p6EAznJx4+M9gsRMQVgJz88h7jTjMHtJV5yvwFYwsfxzBdRx5trHo-ZsbdRftCJBDPMEJqMIkXyOs6E8oT7Itz7RbXJW9Y1VhvaWTt67yKM97TMf16KYEXy9g3718Isz71zcRRYFIfw1YcjZhAh77QGvM66A0X7zRj64GotMoHoEp9QJyr6o1B6YczbZ0zwH7-Qjcm0g6+ofq4qZCOs3xM8VhDRIgThNMgIQheM4ggJPSbygGZqKp6HGHfNZNG7s62Gp8DR9a7Q4g8wVgOt+HswbAhG-ZPSfIk64bigstYAcs8srtSy+SFZZh7R5hYgVx4tmt6c587TPaFcYa4DzaORetzHJ7bCDMikVzvocoVHHH3DX9CkPZWjBDwDCZ5zP92c7AF52svtYgDh1KDHPHigYnidNpScurfHZS6z1Rqsay5xfxyzhiOzMmsBsnkcycIGFELG7AgdymENlLtk0oUSt7qHh6TTamcG8tScD6in9RMkYgvElx1YNsMnaGOR+mPrmG4Zzd5HnZ4rdMZhtQLBAg9g7SbAgctniCeitQwL0RonkCXcFmxdDc5G2ksLOdRZX5sqJ0tx9mSHkQjnkRdTtCqnZnihw9bssb5wNnSD7Gh0gqcJ1RggdRAIwKR5EHBCS9WAfGFHaaz62muFx5ClUp9nYgnpSxftAgMQqGgDfmhDqDkXVn2GcQ1xDgjlT7yrlZ5xczyXznUBiq28yGpgbQdqei6zfwghiCsybAsQ1RvmmrqnJiKjJBtosafEcxwgsSoc-Y2cVCsQj7+7tlxsbQBKTj9CLHF7CQdQ1D9Q9gP9LzKnUhTimAjCTCIBez1z7QiD08e0kjdhASDCQwCBgSsbVcoh2U+F682Ntl3WzjxjSzlg0T1deFFwtcsRIWQ2xiSiJipj5yVXPiFgKzeFRXWy9xdXCjgSsBLiChrjQ6NQlxcaSJqw6zwdvlEodNBlRZiXGxTjE3SjQTwTeJS2E8HVK2lhq2FgSQ7R+XymI1AVEggA */
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
                on: { SPEAK_COMPLETE: [{ target: "Ask_name",
                actions: assign({kind: null, taste:null, alc:null })},
              ] },
              },

              Ask_name: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "HowCanIHelp",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        name: ({ event }) => {

                          // Checking if event.value is an array and has at least one element

                          if (Array.isArray(event.value) && event.value.length > 0) {

                            // Getting the utterance from the first element of the array
                            const utterance = event.value[0].utterance;

                            // Checking if it's a string before proceeding
                            if (typeof utterance === 'string') {

                              // Splitting by space and take the last word as the name

                              const words = utterance.split(' ');
                              return words[words.length - 1];
                            } else {
                              console.error('Unexpected utterance type:', typeof utterance);
                              return '';  
                            }
                          } else {
                            console.error('Unexpected event value:', event.value);
                            return '';  
                          }
                        },
                      }),
                    ],
                  },
                },
              },

              HowCanIHelp: {

                entry: ({ context }) => {
                  animateFaceBasedOnUtterance(`Pleased to make your acquaintance ${context.name}! What sort of beer would you like?`),
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {
                      utterance: `Pleased to make your acquaintance ${context.name}! What sort of beer would you like?`
                    }
                  });
                },
                on: { SPEAK_COMPLETE: "Ask" },
              },

              Further_Inquiry: {

                entry: ({ context }) => {
                  animateFaceBasedOnUtterance(`Alright ${context.name}! What other beer would you like?`),
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {
                      utterance: `Alright ${context.name}! What other beer would you like?`
                    }
                  });
                },
                on: { SPEAK_COMPLETE: "Ask" },
              },

              HelpRepeat: {

                entry:  ({ context }) => {say("I couldn't find what you were looking for, please ask for something else?"),
                animateFaceBasedOnUtterance(`I couldn't find what you were looking for, please ask for something else?`) },
                on: { SPEAK_COMPLETE: "Ask" },
              },

              Ask: {
                entry: listen(),
                on: {
                  SPEAK_COMPLETE: {actions: [listen(),]

                  },
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
                    initial: 'checking',
                    states: {
                      checking: {
                        entry: ({ context }) => {
                          const entities = extractEntities(context.lastResult[0].utterance.toLowerCase());
                          context.request = context.lastResult[0].utterance.toLowerCase()
                          console.log(context.lastResult[0].utterance);
                          
                          // updating the context with extracted entities
                          context.kind = entities.kind || context.kind;
                          context.taste = entities.taste || context.taste;
                          context.alc = entities.alc || context.alc;
                          
                      
                          console.log(context.kind, context.taste, context.alc);
                        },
                        always: [
                          {
                            target: 'fetching_kind',
                            guard: ({ context }) => !context.kind,
                          },
                          {
                            target: 'fetching_taste',
                            guard: ({ context }) => !context.taste,
                          },
                          {
                            target: 'fetching_alc',
                            guard: ({ context }) => !context.alc,
                          },
                          {
                            target: '#root.DialogueManager.Ready.Info_Fetch',
                            guard: ({ context }) => context.kind && context.taste && context.alc,
                          },
                        ],
                      },
                      fetching_kind: {
                        initial: 'loading',
                        states: {
                          loading: {
                            entry: [
                              'startUtteranceRepeating_kind',
                              ({ context }) => {
                                console.log("Loading state activated for kind!"); // Add this line
                                context.isLoading_kind = true;
                              },
                            ],
                            
                            exit: 'stopUtteranceRepeating_kind',
                      
                            invoke: {
                              src: fromPromise(async ({ input }) => {
                                // Constructing the prompt string based on the received input 
                              const max_tokens = 100; 

                              
                              const prompt = `Use a couple filler sounds and filler words. Comment on choosing a beer with this characteristic ${input.request}. Ask what sort of brew type would they like their beer to have. Do not use more than 50 words and only suggest a couple of beer types from this list: "ipa", "lager", "ale", "pilsner", "dark", "white", "brown", "porter" or 'stout'`;
                              
                              
                              const response = await fetchFromChatGPT(prompt, max_tokens);
                      
                              try {
                                  console.log('Type of GPT Response:', typeof response);
                                  return response;
                              } catch (error) {
                                  console.error('Parsing Error:', error, 'Invalid output:', response);
                                  throw error; 
                              }
                                              }),
                                              
                              onDone: {
                                
                                target: '#root.DialogueManager.Ready.Repeat.say_kind',
                                actions: [

                                  ({ event }) => console.log(event.output),
                                  assign({
                                    kind_quote: ({ event }) => {
                                      return event.output.replace(/\*/g, '');
                                    },
                                    isLoading_kind: false
                                  })
                                ]
                              },
                              onError: {
                                target: '#root.DialogueManager.Ready.HelpRepeat',
                                actions: assign({
                                  errorMessage: ({ event }) => {
                                    return event.data;
                                  }
                                })
                              },
                              input: ({ context, event }) => ({
                                request: context.request
                              })
                            }
                          },
                      
                          
                        }
                      },
                      say_kind: {
                      
                        entry: ({ context }) => {
                          animateFaceBasedOnUtterance(`${context.kind_quote}`),
                          context.spstRef.send({
                            type: "SPEAK",
                            value: {
                              utterance: `${context.kind_quote}`
                            }
                          });
                        },
                        on: { SPEAK_COMPLETE: "#root.DialogueManager.Ready.Ask" },
                      },
                      fetching_taste: {
                        initial: 'loading',
                        states: {
                          loading: {
                            entry: [
                              'startUtteranceRepeating_taste',
                              ({ context }) => {
                                console.log("Loading state activated for taste!");
                                context.isLoading_taste = true;
                              },
                            ],
                            
                            exit: 'stopUtteranceRepeating_taste',
                      
                            invoke: {
                              src: fromPromise(async ({ input }) => {
                                
                              const max_tokens = 100; 
                              
                              
                              const prompt = `Use a couple filler sounds and filler words. Do not use more than 65 words. Comment on choosing a beer with this characteristic ${input.request}. Ask how would they like their beer to taste. Only suggest a couple of flavors from this list: "sour", "sweet", "bitter", "fruity", "coffee-like" or "chocolate"`;
                              
                              
                              const response = await fetchFromChatGPT(prompt, max_tokens);
                  
                              try {
                                  console.log('Type of GPT Response:', typeof response);
                                  return response;
                              } catch (error) {
                                  console.error('Parsing Error:', error, 'Invalid output:', response);
                                  throw error; 
                              }
                                              }),
                              onDone: {
                                target: '#root.DialogueManager.Ready.Repeat.say_taste',
                                actions: [
                                  ({ event }) => console.log(event.output),
                                  assign({
                                    taste_quote: ({ event }) => {
                                      return event.output.replace(/\*/g, '');
                                    },
                                    isLoading_taste: false
                                  })
                                ]
                              },
                              onError: {
                                target: '#root.DialogueManager.Ready.HelpRepeat',
                                actions: assign({
                                  errorMessage: ({ event }) => {
                                    return event.data;
                                  }
                                })
                              },
                              input: ({ context, event }) => ({
                                request: context.request
                              })
                            }
                          },
                      
                          
                        }
                      },
                      say_taste: {
                      
                        entry: ({ context }) => {
                          animateFaceBasedOnUtterance(`${context.taste_quote}`),
                          context.spstRef.send({
                            type: "SPEAK",
                            value: {
                              utterance: `${context.taste_quote}`
                            }
                          });
                        },
                        on: { SPEAK_COMPLETE: "#root.DialogueManager.Ready.Ask" },
                      },
                      fetching_alc: {
                        initial: 'loading',
                        states: {
                          loading: {
                            entry: [
                              'startUtteranceRepeating_alc',
                              ({ context }) => {
                                console.log("Loading state activated for alc!"); 
                                context.isLoading_alc = true;
                              },
                            ],
                            
                            exit: 'stopUtteranceRepeating_alc',
                      
                            invoke: {
                              src: fromPromise(async ({ input }) => {
                                
                              const max_tokens = 100; 
                              
                              
                              const prompt = `Use a couple filler sounds and filler words. Do not use more than 65 words. Comment on choosing a beer with this characteristic ${input.request}. Ask what alcohol concentration would they like their beer to have. Only suggest a few relevant words from this list: "strong", "weak", "average"`;
                              
                              
                              const response = await fetchFromChatGPT(prompt, max_tokens);
                      
                              try {
                                  console.log('Type of GPT Response:', typeof response);
                                  return response;
                              } catch (error) {
                                  console.error('Parsing Error:', error, 'Invalid output:', response);
                                  throw error; 
                              }
                                              }),
                              onDone: {
                                
                                target: '#root.DialogueManager.Ready.Repeat.say_alc',
                                actions: [
                                  'forciblyStopSpeech',
                                  ({ event }) => console.log(event.output),
                                  assign({
                                    alc_quote: ({ event }) => {
                                      return event.output.replace(/\*/g, '');
                                    },
                                    isLoading_alc: false
                                  })
                                ]
                              },
                              onError: {
                                target: '#root.DialogueManager.Ready.HelpRepeat',
                                actions: assign({
                                  errorMessage: ({ event }) => {
                                    return event.data;
                                  }
                                })
                              },
                              input: ({ context, event }) => ({
                                request: context.request
                              })
                            }
                          },
                      
                          
                        }
                      },
                      say_alc: {

                        entry: ({ context }) => {
                          animateFaceBasedOnUtterance(`${context.alc_quote}`),
                          context.spstRef.send({
                            type: "SPEAK",
                            value: {
                              utterance: `${context.alc_quote}`
                            }
                          });
                        },
                        on: { SPEAK_COMPLETE: "#root.DialogueManager.Ready.Ask" },
                      },
                    },

              },

              Info_Fetch: {
                initial: 'loading',
                states: {
                  loading: {
                    entry: [
                      'startUtteranceRepeating_info',
                      ({ context }) => {
                        console.log("Loading state activated for info!"); 
                        context.isLoading = true;
                      },
                    ],
                    
                    exit: 'stopUtteranceRepeating_info',
              
                    invoke: {
                      src: fromPromise(async ({ input }) => {
                        
                      const max_tokens = 400; 
                      //console.log(input.alc)
              
                      const prompt = `Format the answer strictly in JSON. Please provide details about some beers that match the following criteria: taste as ${input.taste}, alcohol content as ${input.alc}, and type as ${input.kind}? I am interested in learning about the flavor notes, the manufacturer, and especially the origin of such beers. Could you list at least 3 examples? Please format the answer strictly in JSON with only the "beer" objects in an array`;
              
              
                      const response = await fetchFromChatGPT(prompt, max_tokens);
              
                      try {
                          console.log('Type of GPT Response:', typeof response);
                          return response;
                      } catch (error) {
                          console.error('Parsing Error:', error, 'Invalid JSON:', response);
                          throw error; 
                      }
                              }),
                      onDone: {
                        
                        target: '#root.DialogueManager.Ready.Presenting_Beer',
                        actions:['forciblyStopSpeech',
                          ({ event }) => console.log(JSON.parse(event.output)),
                          assign({
                          beer1: ({ event }) => {
                            console.log('Event:', event); 
                            return JSON.parse(event.output);
                          },
                          isLoading: false,
                        })]
                      },
                      onError: {
                        target: '#root.DialogueManager.Ready.HelpRepeat',
                        actions: assign({
                            errorMessage: ({ event }) => {
                                event.data
                            console.log(event.data)
                            }
                          })
                      },
                      input: ({ context, event }) => ({

                        taste: context.taste,
                        alc: context.alc,
                        kind: context.kind,
                                }),
                    }
                  },
              

                }
              },

              Presenting_Beer: {
                entry: ({ context }) => {
                  animateFaceBasedOnUtterance(`In that case, I would say, I believe that ${context.beer1.beers[0].name} um ${context.beer1.beers[1].name} and ahh, ${context.beer1.beers[2].name} would most likely suit your taste. Would you, by any chance, like to know more about any of them?`),
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {
                      utterance: `In that case, I would say, I believe that ${context.beer1.beers[0].name} um ${context.beer1.beers[1].name} and ahh, ${context.beer1.beers[2].name} would most likely suit your taste. Would you, by any chance, like to know more about any of them?`
                    }
                  });
                },
                on: {
                  SPEAK_COMPLETE: "Ask_Beer"
                }
              },

              Ask_Beer: {
                entry: listen(),
                on: {
                  SPEAK_COMPLETE: {actions: [listen(),]

                  },
                  RECOGNISED: {
                    target: "Beer_Info",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult_beer: ({ event }) => event.value,
                      }),
                    ],
                  },
                },
              },

              Beer_Info: {
                initial: 'loading',
                states: {
                  loading: {
                    entry: [
                      'startUtteranceRepeating_beer',
                      ({ context }) => {
                        console.log("Loading state activated for beer!"); 
                      },

              
                    ],

                    
                    exit: 'stopUtteranceRepeating_beer',
              
                    invoke: {
                      src: fromPromise(async ({ input }) => {
                        const max_tokens = 200;
              
                        const prompt = `The beers are the following: the first one is ${input.type1}, the second one is ${input.type2}, the third one is ${input.type3}. Use no more than 50 words per description.
                        Please do not exceed 55 words when describing each of them and use 5 filler words or sounds per beer description. This is what you must do: ${input.user}. Do not describe if not asked. Use a couple filler sounds and filler words.`;
                        
                        
                        const response = await fetchFromChatGPT(prompt, max_tokens);
              
                        try {
                            console.log('Type of GPT Response:', typeof response);
                            return response;
                        } catch (error) {
                            console.error('Parsing Error:', error, 'Invalid output:', response);
                            throw error; 
                        }
                    }),
                      onDone: {
                        target: '#root.DialogueManager.Ready.say_info',
                        actions:[({ event }) => console.log(event.output),
                            assign({
                            info_quote: ({ event }) => {
                              console.log('Event:', event); 
                              return event.output.replace(/\*/g, '');
                            },
              
                          })]
                      },
                      onError: {
                        target: '#root.DialogueManager.Ready.HelpRepeat',
                        actions: assign({
                            errorMessage: ({ event }) => {
                                event.data
                            console.log(event.data)
                            }
                          })
                      },
                      input: ({ context, event }) => ({

                        type1: context.beer1.beers[0].name,
                        type2: context.beer1.beers[1].name,
                        type3: context.beer1.beers[2].name,
                        beer1: context.beer1,
                        user: context.lastResult_beer[0].utterance.toLowerCase()
                                }),
                    }
                  },
              

                }
              },
              

              say_info: {
              
                entry: ({ context }) => {
                  animateFaceBasedOnUtterance(`${context.info_quote}`),
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {
                      utterance: `${context.info_quote}... Would you be interested in anything else then?`
                    }
                  });
                },
                on: { SPEAK_COMPLETE: [
                  {
                      target: "MoreBeer",
                      actions: assign({kind: null, taste:null, alc:null }),
                      
                  },
                ] },
              },

              // Placeholder state, without it for some reason, the state machines just skips any following state
              MoreBeer: {
                entry: ({ context }) => {
                  console.log("entering more beer")

                  console.log("Animating more beer")
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {
                      utterance: "Would you be interested in anything else then?"
                    }
                  });
                  
                },

                on: { SPEAK_COMPLETE: {
                  target: "Final_Beer",
                }, },
              },

              Final_Beer: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "Final_Beer_Info",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult_beer: ({ event }) => event.value[0].utterance,
                      }),
                    ],
                  },
                },
              },

              Final_Beer_Info: {
                initial: 'loading',
                states: {
                  loading: {
                    entry: [

                      ({ context }) => {
                        console.log("Loading state activated for final!"); 
                      },
                    ],
                    
              
                    invoke: {
                      src: fromPromise(async ({ input }) => {
  
                        const max_tokens = 75; 
                        console.log(input.lastResult_beer)
              
                        const prompt = `Based on the previous user input: ${input.lastResult_beer}, if the user expressed disinterest, respond with a phrase containing "Glad to have been of service". Otherwise, if the user asked a question or showed interest, answer their question and express your willingness to recommend a new beer. Please limit your response to 50 words.`;
              
              
                        const response = await fetchFromChatGPT(prompt, max_tokens);
              
                        try {
                            console.log('Type of GPT Response:', typeof response);
                            return response;
                        } catch (error) {
                            console.error('Parsing Error:', error, 'Invalid output:', response);
                            throw error; 
                        }
                              }),
                      onDone: {
                        target: '#root.DialogueManager.Ready.Final_info',
                        actions: [
                  
                          assign({
                            last_resp: ({ event }) => {
                              console.log('Event:', event); 
                              return event.output.replace(/\*/g, '');
                            },
              
                          }),
                          

                          ({ event }) => console.log(event.output),
                      ],
                      },
                      onError: {
                        target: '#root.DialogueManager.Ready.HelpRepeat',
                        actions: assign({
                            errorMessage: ({ event }) => {
                                event.data
                            console.log(event.data)
                            }
                          })
                      },
                      input: ({ context, event }) => ({

                        lastResult_beer: context.lastResult_beer,
                  
                                }),
                    

                    }
                  },
                }
              },
              Final_info: {
              
                entry: ({ context }) => {
                  animateFaceBasedOnUtterance(`${context.info_quote}`),
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {
                      utterance: `${context.last_resp}`
                    }
                  });
                },
                on: { SPEAK_COMPLETE: [
                  {
                    target:"#root.DialogueManager.Ready.IdleEnd",
                    guard: ({ context })=> context.last_resp.includes("Glad to have been of service")
                  },
                  {
                    target:"#root.DialogueManager.Ready.Further_Inquiry",
              
                  },
              
                  ] },
              },
              

              IdleEnd: {}
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
      forciblyStopSpeech: ({context}) => {

          console.log('Stopping voice...');
          context.spstRef.send({ type: "STOP" });

      },

      startUtteranceRepeating_taste: ({ context }) => {
        repeatingInterval_taste = setInterval(() => {
          context.spstRef.send({
            type: 'SPEAK', value: { utterance: 'Hmm...'} 
          });
          console.log('Hmm...');
          animateFaceBasedOnHarcoded('Hmm...');
        }, 2000);
      },
      stopUtteranceRepeating_taste: ({ context }) => {
        console.log('Stopping voice...');
        context.spstRef.send({ type: "STOP" });
        clearInterval(repeatingInterval_taste);
      },
      startUtteranceRepeating_kind: ({ context }) => {
        repeatingInterval_kind = setInterval(() => {
          context.spstRef.send({
            type: 'SPEAK', value: { utterance: 'Let me think...'} 
          });
          console.log('Hmm...');
          animateFaceBasedOnHarcoded('Let me think...');
        }, 3000);
      },
      stopUtteranceRepeating_kind: ({ context }) => {
        console.log('Stopping voice...');
        context.spstRef.send({ type: "STOP" });
        clearInterval(repeatingInterval_kind);
      },
      startUtteranceRepeating_alc: ({ context }) => {
        repeatingInterval_alc = setInterval(() => {
          context.spstRef.send({
            type: 'SPEAK', value: { utterance: 'Let me think...'} 
          });
          console.log('Hmm...');
          animateFaceBasedOnHarcoded('Let me think...');
        }, 3000);
      },
      stopUtteranceRepeating_alc: ({ context }) => {
        console.log('Stopping voice...');
        context.spstRef.send({ type: "STOP" });
        clearInterval(repeatingInterval_alc);
      },
      startUtteranceRepeating_info: ({ context }) => {
        repeatingInterval_info = setInterval(() => {
          context.spstRef.send({
            type: 'SPEAK', value: { utterance: 'Let me think...'} 
          });
          console.log('Let me think...');
          animateFaceBasedOnHarcoded('Let me think...');
        }, 5000);
      },
      stopUtteranceRepeating_info: ({ context }) => {
        context.spstRef.send({ type: "STOP" });
        clearInterval(repeatingInterval_info);
      },
      startUtteranceRepeating_beer: ({ context }) => {
        repeatingInterval_beer = setInterval(() => {
          context.spstRef.send({
            type: 'SPEAK', value: { utterance: 'Let me think...'} 
          });
          console.log('Let me think...');
          animateFaceBasedOnHarcoded('Let me think...');
        }, 3000);
      },
      stopUtteranceRepeating_beer: ({ context }) => {
        context.spstRef.send({ type: "STOP" });
        clearInterval(repeatingInterval_beer);
      },

      // Not using them because it would be redundant due to the low loading time and simple query
      startUtteranceRepeating_final: ({ context }) => {
        repeatingInterval_final = setInterval(() => {
          context.spstRef.send({
            type: 'SPEAK', value: { utterance: 'Hmm...'} 
          });
          console.log('Hmm...');
          animateFaceBasedOnHarcoded('Hmm...');
        }, 3000);
      },
      stopUtteranceRepeating_final: ({ context }) => {
        context.spstRef.send({ type: "STOP" });
        clearInterval(repeatingInterval_final);
      },


      prepare: ({ context }) =>
        context.spstRef.send({
          type: "PREPARE",
        }),


      "speak.greeting": ({ context }) => {
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Hi I'm Pim! And today I will be your guide into the world of beers! Now, before we start, may please know your name?" },
        });
        animateFaceBasedOnUtterance("Hi I'm Pim! And today I will be your guide into the world of beers! Now, before we start, may please know your name?");
      },

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


export default actor;
document.getElementById("button").onclick = () => actor.send({ type: "CLICK" });

actor.subscribe((state) => {
  console.log(state.value);
});
