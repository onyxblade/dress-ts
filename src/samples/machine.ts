/**
 * A finite state machine as a table: for each state, the events it answers
 * and the state each leads to. The table's type is indexed by the enum, so
 * a state without a row is a type error, not a runtime surprise.
 */
export enum State {
  Draft = 'draft',
  Review = 'review',
  Published = 'published',
  Archived = 'archived',
}

export const EVENTS = ['submit', 'approve', 'reject', 'publish', 'archive', 'restore'] as const
export type Event = (typeof EVENTS)[number]

type Table = { readonly [S in State]: Partial<Record<Event, State>> }

const transitions: Table = {
  [State.Draft]: { submit: State.Review, archive: State.Archived },
  [State.Review]: { approve: State.Published, reject: State.Draft },
  [State.Published]: { archive: State.Archived },
  [State.Archived]: { restore: State.Draft },
}

export class Document {
  static readonly initial = State.Draft

  private history: Array<[Event, State]> = []

  constructor(public state: State = Document.initial) {}

  /** Whether the current state answers `event`. */
  can(event: Event): boolean {
    return event in transitions[this.state]
  }

  send(event: Event): State {
    const next = transitions[this.state][event]
    if (next === undefined) {
      throw new Error(`cannot ${event} while ${this.state}`)
    }
    this.history.push([event, this.state])
    this.state = next
    return next
  }

  /** Undo the last event, if there was one. */
  back(): boolean {
    const last = this.history.pop()
    if (!last) return false
    const [, previous] = last
    this.state = previous
    return true
  }

  get log(): string {
    const steps = this.history.map(([event, from]) => `${from} --${event}-->`)
    return [...steps, this.state].join(' ')
  }
}

/** Every state some sequence of events leads to from `start`, `start` included. */
export function reachable(start: State): Set<State> {
  const seen = new Set<State>([start])
  const queue = [start]
  let state: State | undefined
  while ((state = queue.shift()) !== undefined) {
    for (const next of Object.values(transitions[state])) {
      if (next === undefined || seen.has(next)) continue
      seen.add(next)
      queue.push(next)
    }
  }
  return seen
}
