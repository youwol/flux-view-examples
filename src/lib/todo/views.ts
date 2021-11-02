import { attr$, child$, children$, Stream$, VirtualDOM } from '@youwol/flux-view'
import { BehaviorSubject, combineLatest, Observable, timer } from 'rxjs'
import { map } from 'rxjs/operators'
import { AppState, Item } from './app.state'

enum FilterMode {
    All = 'All',
    Active = 'Active',
    Completed = 'Completed'
}


export class TitleView implements VirtualDOM {

    class = 'text-center w-100 border rounded p-2 my-3'
    children: VirtualDOM[]

    date$ = timer(0, 1000).pipe(
        map(() => new Date())
    )

    constructor() {
        this.children = [
            {
                tag: 'h1',
                class: 'fv-text-focus',
                innerText: "Todo",
            },
            {
                class: 'fas fa-clock',
                innerText: attr$(
                    this.date$,
                    (date) => `${date.toTimeString()}`
                )
            }
        ]
    }
}


export class ItemView implements VirtualDOM {

    tag = 'span'
    class = "item-view d-flex align-items-center my-1 justify-content-between fv-pointer"

    children: VirtualDOM[]
    public readonly state: AppState
    public readonly item: Item
    private readonly editing$ = new BehaviorSubject<boolean>(false)

    constructor(item: { id: number, name: string, done: boolean }, state) {

        Object.assign(this, { item, state })

        const baseClass = 'fv-color-primary fv-hover-color-focus p-2 rounded-circle fv-text-success'
        this.children = [
            {
                class: baseClass + (item.done ? ' fas fa-check' : ''),
                style: { width: '35px', height: '35px' },
                onclick: () => state.toggleItem(item.id)
            },
            child$(
                this.editing$,
                (editing: boolean) => editing ? this.editionView() : this.presentationView(),
                {
                    sideEffects: (_, elem: HTMLSpanElement | HTMLInputElement) => elem.focus()
                }
            ),
            {
                class: 'item-remove fas fa-times fv-text-error mx-2 p-1 fv-hover-opacity',
                onclick: () => state.deleteItem(item.id)
            }
        ]
    }

    presentationView(): VirtualDOM {

        return {
            tag: 'span',
            class: `px-2 user-select-none ${this.item.done ? 'fv-text-disabled' : 'fv-text-focus'}`,
            style: { 'text-decoration': this.item.done ? 'line-through' : '' },
            innerText: this.item.name,
            ondblclick: () => this.editing$.next(true)
        }
    }

    editionView(): VirtualDOM {

        return {
            tag: 'input', type: 'text', value: this.item.name,
            onclick: (ev) => ev.stopPropagation(),
            onkeypress: (ev) => {
                if (ev.key == "Enter")
                    this.state.setName(this.item.id, ev.target.value)
            },
            onblur: (ev) => this.state.setName(this.item.id, ev.target.value)
        }
    }
}

export class ItemsView implements VirtualDOM {

    class = "border rounded p-2 m-2 flex-grow-1 overflow-auto"
    style = {
        'min-height': '200px'
    }
    children: Stream$<Item[], VirtualDOM[]>

    private filters = {
        [FilterMode.All]: () => true,
        [FilterMode.Active]: (item) => !item.done,
        [FilterMode.Completed]: (item) => item.done
    }

    constructor(state: AppState, filterMode$: Observable<FilterMode>) {

        let selectedItems$ = combineLatest([state.items$, filterMode$]).pipe(
            map(([items, mode]) => items.filter(item => this.filters[mode](item)))
        )

        this.children = children$(
            selectedItems$,
            (items) => items.map(item => new ItemView(item, state))
        )
    }
}

export class NewItemView {

    tag = 'header'
    children: VirtualDOM[]
    completed$: Observable<any>
    class = 'd-flex align-items-center my-3 justify-content-around'
    style = {
        fontSize: 'x-large'
    }
    constructor(state) {

        this.children = [
            {
                tag: 'i',
                class: attr$(
                    state.completed$,
                    (completed) => completed ? 'fv-text-disable' : 'fv-text-focus',
                    { wrapper: (d) => `${d} fas fa-chevron-down p-2 fv-pointer fv-color-primary rounded-circle` }
                ),
                onclick: () => state.toggleAll()
            },
            {
                tag: 'input', autofocus: 'autofocus', autocomplete: 'off',
                placeholder: "What needs to be done?", class: 'new-todo px-2',
                onkeypress: (ev) => { (ev.key == "Enter") && state.addItem(ev.target.value) && (ev.target.value = "") }
            }
        ]
    }

}

export class FooterView {

    class = 'd-flex align-items-center px-3 border-top py-2 text-secondary'
    children: VirtualDOM[]

    constructor(state, filterMode$: BehaviorSubject<FilterMode>) {

        let class$ = (target) => attr$(
            filterMode$,
            (mode) => mode == target ? 'fv-text-focus fv-color-primary rounded px-1' : 'fv-text-disabled',
            { wrapper: (d) => `${d} fv-pointer mx-2 fv-hover-text-enabled` }
        )

        this.children = [
            {
                tag: 'span',
                innerText: attr$(state.remaining$, (items) => items.length, {
                    wrapper: (d) => `${d} item${d > 1 ? 's' : ''} left`
                })
            },
            {
                class: 'd-flex align-items-center mx-auto',
                children: [
                    {
                        tag: 'i',
                        class: 'fas fa-filter px-2'
                    },
                    {
                        tag: 'i', innerText: 'All', class: class$(FilterMode.All),
                        onclick: () => filterMode$.next(FilterMode.All)
                    },
                    {
                        tag: 'i', innerText: 'Active', class: class$(FilterMode.Active),
                        onclick: () => filterMode$.next(FilterMode.Active)
                    },
                    {
                        tag: 'i', innerText: 'Completed', class: class$(FilterMode.Completed),
                        onclick: () => filterMode$.next(FilterMode.Completed)
                    }
                ]
            }
        ]
    }
}


export class AppView {

    public readonly class = "p-3 w-100 h-100 fv-bg-background fv-text-primary d-flex flex-column rounded"
    public readonly children: VirtualDOM[]
    public readonly filterMode$ = new BehaviorSubject(FilterMode.All)

    constructor(state: AppState) {

        this.children = [
            new TitleView(),
            new NewItemView(state),
            new ItemsView(state, this.filterMode$),
            new FooterView(state, this.filterMode$)
        ]
    }
}
