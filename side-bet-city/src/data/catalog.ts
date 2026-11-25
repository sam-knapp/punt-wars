import type {
  BetCategory,
  BetOption,
  DeliveryMode,
  Duration,
  Intensity,
  KidSetting,
} from '../types'
import { CHEEKY_OPTIONS } from './cheeky.ts'

type Axis = {
  mode: DeliveryMode
  duration: Duration
  kids: KidSetting
  winnerPicks: boolean
}

type Proof = 'photo' | 'video' | 'text' | 'chat'

type Built = {
  key: string
  label: string
  description: string
  category: BetCategory
  intensity: Intensity
}

const MODES: DeliveryMode[] = ['in-person', 'remote', 'online']
const DURATIONS: Duration[] = ['quick', 'errand', 'week', 'season']
const KIDS: KidSetting[] = ['around', 'bedtime']

function title(base: string, axis: Axis): string {
  const name = axis.winnerPicks
    ? `Winner's ${base}`
    : base.charAt(0).toUpperCase() + base.slice(1)
  const extras: string[] = []
  if (axis.mode === 'remote') extras.push('on video')
  if (axis.mode === 'online') extras.push('in the chat')
  if (axis.kids === 'bedtime') extras.push('after bedtime')
  if (axis.duration === 'quick') extras.push('quick')
  if (axis.duration === 'week') extras.push('all week')
  return extras.length ? `${name}, ${extras.join(', ')}` : name
}

function cadence(duration: Duration): string {
  if (duration === 'quick') return 'Finish it in under 15 minutes.'
  if (duration === 'errand') return 'It takes one outing.'
  if (duration === 'week') return 'Keep it up every day until next Sunday.'
  return 'Complete it before the next draft, and let the league track the result.'
}

function witness(mode: DeliveryMode, proof: Proof): string {
  if (proof === 'text') return 'Every leaguemate gets it. Nobody is skipped.'
  if (proof === 'chat') return 'Leave it in the league chat so the whole league sees it.'
  if (mode === 'in-person') {
    return 'A leaguemate has to be there, and the photo goes in the league chat.'
  }
  if (mode === 'remote') return 'Send the video to the league chat. No cuts.'
  return 'Post the proof in the league chat and leave it up.'
}

function finish(action: string, axis: Axis, proof: Proof): string {
  return `${action} ${cadence(axis.duration)} ${witness(axis.mode, proof)}`
}

function coffee(axis: Axis): Built {
  const drink = axis.winnerPicks ? 'the drink the winner names' : 'a large black coffee'
  let action: string
  if (axis.mode === 'in-person' && axis.kids === 'around') {
    action = `Loser buys ${drink} and hands it to the winner at the driveway or the sideline.`
  } else if (axis.mode === 'in-person') {
    action = `Loser buys ${drink} and leaves it on the winner's porch once the kids are down.`
  } else if (axis.mode === 'remote') {
    action = `Loser orders ${drink} to the winner's door and films the drop from the sidewalk.`
  } else {
    action = `Loser pays for ${drink} and posts the receipt before anyone has to ask.`
  }
  return {
    key: 'coffee',
    label: title('coffee run', axis),
    description: finish(action, axis, axis.mode === 'online' ? 'chat' : 'photo'),
    category: 'cash',
    intensity: { pain: 1, difficulty: 1, embarrassment: 1 },
  }
}

function snacks(axis: Axis): Built {
  const food = axis.winnerPicks
    ? 'the snacks the winner names'
    : 'goldfish, apples, and juice boxes'
  let action: string
  if (axis.mode === 'in-person' && axis.kids === 'around') {
    action = `Loser shows up to the next kids' practice with ${food}.`
  } else if (axis.mode === 'in-person') {
    action = `Loser packs ${food} into the winner's snack bin and leaves it for the morning.`
  } else if (axis.mode === 'remote') {
    action = `Loser orders ${food} for delivery to the winner and films the bags on the step.`
  } else {
    action = `Loser posts a photo of ${food}, packed and labeled for the winner's kids.`
  }
  return {
    key: 'snacks',
    label: title('snack run', axis),
    description: finish(action, axis, axis.mode === 'online' ? 'chat' : 'photo'),
    category: 'chores',
    intensity: { pain: 1, difficulty: 2, embarrassment: 1 },
  }
}

function twenty(axis: Axis): Built {
  const memo = axis.winnerPicks ? 'the memo the winner writes' : '"you were right"'
  let action: string
  if (axis.mode === 'in-person') {
    action =
      axis.kids === 'around'
        ? `Loser counts out $25 in singles, memo ${memo}, and hands it over at pickup.`
        : `Loser counts out $25 in singles, memo ${memo}, on the winner's porch after the kids are down.`
  } else if (axis.mode === 'remote') {
    action = `Loser sends $25 with the memo ${memo} and films the payment screen.`
  } else {
    action = `Loser sends $25 with the memo ${memo} and posts the screenshot.`
  }
  return {
    key: 'twenty-five',
    label: title('$25 apology', axis),
    description: finish(action, axis, axis.mode === 'in-person' ? 'photo' : 'chat'),
    category: 'cash',
    intensity: { pain: 2, difficulty: 1, embarrassment: 1 },
  }
}

function goodnight(axis: Axis): Built {
  const line = axis.winnerPicks
    ? 'the exact sentence the winner writes'
    : '"good night, I love you and I\'m sorry"'
  let action: string
  if (axis.mode === 'remote') {
    action = `Loser texts each member of the group individually: ${line}.`
  } else if (axis.mode === 'in-person' && axis.kids === 'around') {
    action = `Loser says ${line} out loud to every leaguemate at pickup or practice.`
  } else if (axis.mode === 'in-person') {
    action = `Loser says ${line} on the winner's porch once the kids are down.`
  } else {
    action = `Loser posts ${line} with no emojis and no follow-up joke.`
  }
  const classic =
    axis.mode === 'remote' &&
    axis.duration === 'quick' &&
    axis.kids === 'bedtime' &&
    !axis.winnerPicks
  return {
    key: 'goodnight',
    label: classic ? 'Goodnight, I love you' : title('goodnight text', axis),
    description: classic
      ? 'Loser texts each member of the group individually: "good night, I love you and I\'m sorry." Those texts are the proof. Finish it in under 15 minutes.'
      : finish(
          action,
          axis,
          axis.mode === 'remote' ? 'text' : axis.mode === 'online' ? 'chat' : 'photo',
        ),
    category: 'shame',
    intensity: { pain: 1, difficulty: 2, embarrassment: 2 },
  }
}

function portrait(axis: Axis): Built {
  const piece = axis.winnerPicks
    ? 'a pose or style the winner picks'
    : 'a genuine best-effort portrait of the winner'
  let action: string
  if (axis.mode === 'in-person') {
    action =
      axis.kids === 'around'
        ? `Loser draws or paints ${piece} at the next practice or pickup.`
        : `Loser draws or paints ${piece} at the winner's house after the kids are down.`
  } else if (axis.mode === 'remote') {
    action = `Loser draws or paints ${piece} while on a video call with the league.`
  } else {
    action = `Loser draws or paints ${piece} and posts the finished picture.`
  }
  return {
    key: 'portrait',
    label: title('portrait attempt', axis),
    description: finish(action, axis, axis.mode === 'in-person' ? 'photo' : 'video'),
    category: 'social',
    intensity: { pain: 1, difficulty: 3, embarrassment: 3 },
  }
}

function transaction(axis: Axis): Built {
  const move = axis.winnerPicks
    ? 'a waiver pickup or trade the winner chooses'
    : 'one waiver pickup the winner chooses'
  let action: string
  if (axis.mode === 'in-person') {
    action = `Loser gives the winner control of ${move} for next week and accepts the decision at the next meetup.`
  } else if (axis.mode === 'remote') {
    action = `Loser gives the winner control of ${move} for next week and confirms it by text.`
  } else {
    action = `Loser gives the winner control of ${move} for next week and posts the transaction in the league chat.`
  }
  return {
    key: 'transaction',
    label: title('lineup transaction', axis),
    description: finish(action, axis, 'chat'),
    category: 'social',
    intensity: { pain: 4, difficulty: 1, embarrassment: 3 },
  }
}

function voice(axis: Axis): Built {
  const script = axis.winnerPicks
    ? 'three compliments the winner wrote'
    : 'one straight minute on why the winner\'s lineup was braver'
  let action: string
  if (axis.mode === 'in-person') {
    action =
      axis.kids === 'around'
        ? `Loser delivers ${script} in person at practice.`
        : `Loser delivers ${script} on the porch after the kids are down.`
  } else if (axis.mode === 'remote') {
    action = `Loser records ${script} as a voice note.`
  } else {
    action = `Loser posts ${script} as a voice note.`
  }
  return {
    key: 'voice',
    label: title('praise minute', axis),
    description: finish(action, axis, axis.mode === 'in-person' ? 'video' : 'chat'),
    category: 'social',
    intensity: { pain: 2, difficulty: 2, embarrassment: 2 },
  }
}

function haul(axis: Axis): Built {
  let action: string
  if (axis.mode === 'in-person' && axis.kids === 'around') {
    action = axis.winnerPicks
      ? 'Loser covers the carpool or practice run the winner picks.'
      : "Loser covers one of the winner's school or practice carpools."
  } else if (axis.mode === 'in-person') {
    action = axis.winnerPicks
      ? 'Loser does the after-bedtime kitchen reset the winner describes.'
      : "Loser runs the winner's dishwasher and wipes the counters once the kids are down."
  } else if (axis.mode === 'remote') {
    action = axis.winnerPicks
      ? 'Loser orders the groceries the winner lists and films the delivery on the step.'
      : "Loser orders the winner's usual groceries and films the bags on the step."
  } else {
    action = axis.winnerPicks
      ? 'Loser posts the receipt for the grocery list the winner wrote.'
      : "Loser posts the receipt for a full restock of the winner's snack bin."
  }
  return {
    key: 'haul',
    label: title(axis.kids === 'around' && axis.mode === 'in-person' ? 'carpool' : 'restock', axis),
    description: finish(action, axis, axis.mode === 'online' ? 'chat' : 'photo'),
    category: 'chores',
    intensity: { pain: 2, difficulty: 2, embarrassment: 2 },
  }
}

function eggs(axis: Axis): Built {
  const dietCoke =
    axis.mode === 'in-person' &&
    axis.kids === 'bedtime' &&
    axis.duration === 'quick' &&
    !axis.winnerPicks
  if (dietCoke) {
    return {
      key: 'diet-coke',
      label: 'Diet Coke shotgun',
      description:
        'Loser shotguns a Diet Coke in front of a leaguemate once the kids are down. The burp counts. Finish it in under 15 minutes. A leaguemate has to be there, and the clip goes in the league chat.',
      category: 'sweat',
      intensity: { pain: 3, difficulty: 2, embarrassment: 4 },
    }
  }

  if (axis.mode === 'remote') {
    const reps = axis.duration === 'errand' ? '1,000' : '100'
    const line = axis.winnerPicks ? ' The winner picks the forfeit word you shout at the end.' : ''
    return {
      key: 'keepy',
      label: title('balloon keepy-uppies', axis),
      description: finish(
        `Loser films ${reps} keepy-uppies with a balloon.${line}`,
        axis,
        'video',
      ),
      category: 'sweat',
      intensity:
        axis.duration === 'errand'
          ? { pain: 3, difficulty: 5, embarrassment: 3 }
          : { pain: 3, difficulty: 3, embarrassment: 2 },
    }
  }

  const spoken = axis.winnerPicks
    ? ' and says the line the winner wrote as they hand them over'
    : ''
  const action =
    axis.mode === 'in-person'
      ? `Loser hard-boils, peels, and hand-delivers 12 eggs${spoken}.`
      : `Loser posts a photo of 12 peeled eggs, lined up and counted${spoken}.`
  return {
    key: 'eggs',
    label: title('peeled dozen', axis),
    description: finish(action, axis, axis.mode === 'online' ? 'chat' : 'photo'),
    category: 'chores',
    intensity: { pain: 2, difficulty: 4, embarrassment: 3 },
  }
}

function outfit(axis: Axis): Built {
  if (axis.mode === 'online') {
    const photo = axis.winnerPicks
      ? 'a profile photo the winner picks'
      : 'a photo of the loser in a paper crown'
    return {
      key: 'profile',
      label: title('profile pic', axis),
      description: finish(
        `Loser sets ${photo} and leaves it up where the league can see it.`,
        axis,
        'chat',
      ),
      category: 'social',
      intensity: { pain: 2, difficulty: 1, embarrassment: 5 },
    }
  }

  if (axis.kids === 'around') {
    const clothes = axis.winnerPicks
      ? 'an outfit the winner picks'
      : "the winner's rival jersey"
    const spot = axis.mode === 'in-person' ? 'to a kids\' sporting event' : 'and films the full outfit at home'
    return {
      key: 'outfit',
      label: title('sideline outfit', axis),
      description: finish(`Loser wears ${clothes} ${spot}.`, axis, 'photo'),
      category: 'shame',
      intensity: { pain: 2, difficulty: 2, embarrassment: 5 },
    }
  }

  const song = axis.winnerPicks ? 'the song the winner names' : "the winner's fight song"
  const action =
    axis.mode === 'in-person'
      ? `Loser sings ${song} in the yard once the kids are down.`
      : `Loser sings ${song} and films the whole verse.`
  return {
    key: 'anthem',
    label: title('fight song', axis),
    description: finish(action, axis, 'video'),
    category: 'shame',
    intensity: { pain: 1, difficulty: 2, embarrassment: 4 },
  }
}

const BUILDERS = [coffee, snacks, twenty, goodnight, portrait, transaction, voice, haul, eggs, outfit]

const GENERATED_OPTIONS: BetOption[] = MODES.flatMap((mode) =>
  DURATIONS.flatMap((duration) =>
    KIDS.flatMap((kids) =>
      [false, true].flatMap((winnerPicks) => {
        const axis: Axis = { mode, duration, kids, winnerPicks }
        return BUILDERS.map((build) => {
          const stake = build(axis)
          return {
            id: `${stake.key}-${mode}-${duration}-${kids}-${winnerPicks ? 'winner' : 'set'}`,
            label: stake.label,
            description: stake.description,
            category: stake.category,
            modes: [mode],
            duration,
            kids,
            winnerPicks,
            intensity: stake.intensity,
          }
        })
      }),
    ),
  ),
)

export const BET_OPTIONS: BetOption[] = [...GENERATED_OPTIONS, ...CHEEKY_OPTIONS]
