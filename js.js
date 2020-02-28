const Sort = {
    _sortStrategy: function(desc) {
        return (a, b) => {
            switch (typeof a) {
                case "number":
                    return desc ? b - a : a - b;
                case "string":
                    return (desc ? a < b : a > b) ? 1 : -1;
                default:
                    return true;
            }
        };
    }
};

const Filter = {
    _filterStrategy: (strategy, text) => {
        const removeSpecials = text => {
            var specials = [
                    "-",
                    "[",
                    "]",
                    "/",
                    "{",
                    "}",
                    "(",
                    ")",
                    "*",
                    "+",
                    "?",
                    ".",
                    "\\",
                    "^",
                    "$",
                    "|"
                ],
                regex = RegExp("[" + specials.join("\\") + "]", "g");
            return text.replace(regex, "\\$&");
        };

        switch (strategy) {
            case "_startIgnoreCase":
                return source =>
                    new RegExp(`^${removeSpecials(text)}`, "i").test(source);
            case "_start":
            default:
                return source =>
                    new RegExp(`^${removeSpecials(text)}`).test(source);
        }
    }
};

const StringWorker = {
    upperCasecFirst: str => (str ? str[0].toUpperCase() + str.slice(1) : "")
};

class TableSortable {
    constructor(items, option) {
        this.el = document.createElement("table");
        this.el.className = "table-sortable";
        this.el.addEventListener("click", this.onClick.bind(this));

        this.option = Object.assign(
            {
                nameHead: {}
            },
            option
        );

        this.headNameRow = items.length ? Object.keys(items[0]) : [];
        this.bodyValueRows = items.length
            ? items.map(e => this.headNameRow.map(h => e[h]))
            : [];

        this.filterList = this.bodyValueRows;

        this.render(true);
    }

    sort = (column, desc = false) => {
        this.filterList.sort((a, b) =>
            this._sortStrategy(desc)(a[column], b[column])
        );
        this.render();
    };

    filter = (text, ...column) => {
        this.filterList = this.bodyValueRows.filter(e => {
            if (!column.length) return true;

            return column.reduce(
                (res, currIndex) =>
                    res || this._filterStrategy("_start", text)(e[currIndex]),
                false
            );
        });

        this.render();
    };

    render(printHead = false) {
        if (printHead) {
            this.el.innerHTML = `${this.getHeadHtml(trObject => {
                trObject.splice(0, 1, this.upperCasecFirst(trObject[0]));
                return trObject;
            })}${this.getBodyHtml()}`;
        } else {
            let body = this.el.querySelector("tbody");
            body.innerHTML = this.getBodyHtml();
        }
    }

    getHeadHtml = function(callbackFormat) {
        callbackFormat =
            typeof callbackFormat == "function" ? callbackFormat : e => e;

        let tds = this.headNameRow.reduce((res, curr) => {
            curr = this.option.nameHead[curr] || curr;
            return `${res}<td class='table-sortable__head-cell'>${callbackFormat(
                [curr]
            )
                .map(e => e)
                .join("")}</td>`;
        }, "");

        return `<thead><tr class='table-sortable__head-row'>${tds}<tr></thead>`;
    };

    getBodyHtml = function(callbackFormat) {
        callbackFormat =
            typeof callbackFormat == "function" ? callbackFormat : e => e;
        let trs = this.filterList
            .map(
                e =>
                    `<tr class='table-sortable__body-row'>${callbackFormat(e)
                        .map(i => `<td class='table-sortable__body-cell'>${i}</td>`)
                        .join("")}</tr>`
            )
            .join("");
        return `<tbody>${trs}</tbody>`;
    };

    THEAD = {
        onClick: () => {}
    };

    strategyOnClick(cls, event) {
        let method = cls.replace(".", "").replace(new RegExp("-", "g"), "_");
        if (this[method]) this[method](cls, event);
    }

    table_sortable__head_cell(cls, event) {
        let tdHead = event.target.closest(cls);

        if (!tdHead) return;

        let desc = false;

        if (
            tdHead.classList.contains("asc") ||
            tdHead.classList.contains("desc")
        ) {
            tdHead.classList.toggle("asc");
            tdHead.classList.toggle("desc");
            desc = tdHead.classList.contains("desc");
        } else {
            tdHead.classList.add("asc");
        }

        let tds = this.el.querySelectorAll(cls);
        tds.forEach(td => {
            if (td != tdHead) {
                td.classList.remove("asc");
                td.classList.remove("desc");
            }
        });

        this.sort(tdHead.cellIndex, desc);
    }

    onClick(event) {
        this.strategyOnClick(".table-sortable__head-cell", event);
    }
}

Object.assign(TableSortable.prototype, Sort, Filter, StringWorker);