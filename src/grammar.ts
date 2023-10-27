export interface Grammar {
    [key: string]: {
    intent: string;
    entities: {
      [index: string]: string;
    };
  };
}

export const grammar: Grammar = {
    "my top five songs": {
      intent: "None",
      entities: { spotify: "The name is"},
    },
    "can you show me my top five": {
      intent: "None",
      entities: { spotify: "The name is"},
    },
    "my recommended songs": {
      intent: "None",
      entities: { recommendation: "The name is"},
    },
    "create a playlist": {
      intent: "None",
      entities: { playlist: "The name is"},
    },
    "can you tell me more about them": {
      intent: "None",
      entities: { artist: "The name is"},
    },
    "yes": {
      intent: "None",
      entities: { yes: "The name is"},
    },
    "yes, please": {
      intent: "None",
      entities: { yes: "The name is"},
    },
    "yes, actually": {
      intent: "None",
      entities: { yes: "The name is"},
    },
    "i do": {
      intent: "None",
      entities: { yes: "The name is"},
    },
    "i don't": {
      intent: "None",
      entities: { no: "The name"},
    },
    "no": {
      intent: "None",
      entities: { no: "The name is"},
    },
    "i wouldn't": {
      intent: "None",
      entities: { no: "The name is"},
    },
    "i would": {
      intent: "None",
      entities: { yes: "d"},
    },
    "i would love that": {
      intent: "None", 
      entities: { yes: "id"},
    },
    "not really": {
      intent: "None",
      entities: { no: "The name is"},
    },
    "can you play something by gracie abrams": {
      intent: "None",
      entities: { artist_play: "The name is"},
    },
    "something by gracie abrams": {
      intent: "None",
      entities: {artist_play: "The name is"},
    },
    "can you play something by taylor swift": {
      intent: "None",
      entities: { artist_play: "The name is"},
    },
    "something by taylor swift": {
      intent: "None",
      entities: {artist_play: "The name is"},
    },
    "can you play something by maisie peters": {
      intent: "None",
      entities: { artist_play: "The name is"},
    },
    "something by maisie peters": {
      intent: "None",
      entities: {artist_play: "The name is"},
    },
    "can you play something by olivia rodrigo": {
      intent: "None",
      entities: { artist_play: "The name is"},
    },
    "something by sabrina carpenter": {
      intent: "None",
      entities: {artist_play: "The name is"},
    },
    "can you play something by clara luciani": {
      intent: "None",
      entities: { artist_play: "The name is"},
    },
    "something by clara luciani": {
      intent: "None",
      entities: {artist_play: "The name is"},
    },
    "play something else": {
      intent: "None",
      entities: { no: "The name is"},
    },
    "can you play somethin else": {
      intent: "None",
      entities: { no: "The name is"},
    },
    "i don't want to listen to music anymore": {
      intent: "None",
      entities: { full_stop: "The name is"},
    },
    "that's enough": {
      intent: "None",
      entities: { full_stop: "The name is"},
    },
    "can you stop":{
      intent: "None",
      entities: { stop: "The name is"},
    },
    "continue": {
      intent: "None",
      entities: { continue: "The name is" },
    },
    "i feel pretty sad right now": {
      intent: "None",
      entities: { sad_playlist: "The name is"},
    },
    "i'm having a party, so i want something to dance to": {
      intent: "None",
      entities: { happy_playlist: "the name is"},
    },
  };