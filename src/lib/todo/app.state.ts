import { BehaviorSubject, Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface Item {
    id: number
    name: string
    done: boolean
}

export class AppState {

    static STORAGE_KEY = "todos";

    public readonly items$: BehaviorSubject<Item[]>
    public readonly completed$: Observable<boolean>
    public readonly remaining$: Observable<Item[]>

    constructor(defaultItems?: Array<Item>) {
        this.items$ = defaultItems
            ? new BehaviorSubject<Item[]>(defaultItems)
            : new BehaviorSubject<Item[]>(JSON.parse(localStorage.getItem(AppState.STORAGE_KEY) || "[]"))

        this.items$.subscribe(items => {
            localStorage.setItem(AppState.STORAGE_KEY, JSON.stringify(items));
        })
        this.completed$ = this.items$.pipe(
            map(items => items.reduce((acc, item) => acc && item.done, true))
        )
        this.remaining$ = this.items$.pipe(
            map(items => items.filter((item) => !item.done))
        )
    }

    toggleAll() {
        let completed = this.getItems().reduce((acc, item) => acc && item.done, true)
        this.items$.next(this.getItems().map(item => ({ id: item.id, name: item.name, done: !completed })))
    }

    addItem(name) {
        let item = { id: Date.now(), name, done: false }
        this.items$.next([...this.getItems(), item])
        return item
    }

    deleteItem(id) {
        this.items$.next(this.getItems().filter(item => item.id != id))
    }

    toggleItem(id) {
        let items = this.getItems().map(item => item.id == id ? { id: item.id, name: item.name, done: !item.done } : item)
        this.items$.next(items)
    }

    setName(id, name) {
        let items = this.getItems().map(item => item.id == id ? { id: item.id, name, done: item.done } : item)
        this.items$.next(items)
    }

    private getItems() {
        return this.items$.getValue()
    }
}
