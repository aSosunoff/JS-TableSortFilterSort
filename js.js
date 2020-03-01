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

const Pagging = {
    _pagging: (currentPage, pageSize) => pageSize ? [pageSize * currentPage - pageSize, pageSize * currentPage] : [0],
    _isBetween: (number, start, end) => {
        if(!end && end != 0) {
            end = start;
            start = 0;
        }
    
        return Math.min(start, end) <= number && number <= Math.max(start, end);
    }
}

class TableSortable {
    constructor(items, option) {
        this.el = document.createElement("div");
        this.el.className = "container-table";
        this.el.addEventListener("click", this.onClick.bind(this));
        this.el.addEventListener("keyup", this.onKeyup.bind(this));

        let table = document.createElement("table");
        table.className = "table-sortable";
        
        this.el.append(table);

        this.option = Object.assign({ 
            nameHead: {},
            pageSize: 5,
            currentPage: 1,
            sort: {
                column: null,
                desc: false
            }
        }, option);

        this.headNameRow = items.length ? Object.keys(items[0]) : [];
        this.bodyValueRows = items.length
            ? items.map(e => this.headNameRow.map(h => e[h]))
            : [];

        this.filterList = this.bodyValueRows
            .slice(...this._pagging(this.option.currentPage, this.option.pageSize));

        this.render(true);
    }

    _sort = (column, desc = false) => {
        this.filterList.sort((a, b) =>
            this._sortStrategy(desc)(a[column], b[column])
        );
        
        this.option.sort.column = column;
        this.option.sort.desc = desc;
    };

    _filter = () => {
        let cells = this.el.querySelectorAll('.table-sortable__sort-cell');

        let indexs = Array.from(cells)
            .filter(e => e.querySelector('.table-sortable__input').value)
            .map(m => {
                return {
                    index: m.cellIndex,
                    value: m.querySelector('.table-sortable__input').value
                };
            });
        
        this.filterList = this.bodyValueRows.filter(e => {
            if (!indexs.length) return true;

            return indexs.reduce(
                (res, currIndex) => res || this._filterStrategy("_start", currIndex.value)(e[currIndex.index])
                , false);
        });
    }

    sort = (column, desc = false) => {
        this.option.sort.column = column;
        this.option.sort.desc = desc;
        this.render();
    };

    filter = () => {
        this.render();
    };

    nextPage(){
        this.currentPage(++this.option.currentPage);
    }

    prevPage(){
        this.currentPage(--this.option.currentPage);
    }

    currentPage(page){
        let countPage = Math.ceil(this.filterList.length / this.option.pageSize);

        this.option.currentPage = this._isBetween(page, 1, countPage) 
            ? page 
            : (1 > page ? 1 : countPage);
        
        this.render();
    }

    render(printHead = false) {
        if (printHead) {
            this.renderHeadHtml(trObject => {
                trObject.splice(0, 1, this.upperCasecFirst(trObject[0]));
                return trObject;
            });
        }

        this.renderBodyHtml();
    }

    renderHeadHtml(callbackFormat) {
        callbackFormat = typeof callbackFormat == "function" ? callbackFormat : e => e;

        let tds = this.headNameRow.reduce((res, curr) => {
            curr = this.option.nameHead[curr] || curr;
            return `${res}<td class='table-sortable__head-cell'>${callbackFormat([curr])
                .map(e => e)
                .join("")}</td>`;
        }, "");

        let thead = this.el.querySelector('thead');
        
        if(thead)
            thead.remove();

        let table = this.el.querySelector('table');

        table.insertAdjacentHTML('afterbegin', `
        <thead>
            <tr class='table-sortable__head-row'>${tds}<tr>
            <tr class='table-sortable__sort-row'>${
                this.headNameRow.reduce((res, curr) => `${res}<td class='table-sortable__sort-cell'><input class='table-sortable__input' type="text"/></td>`,'')
            }</tr>
        </thead>`);
    };

    renderBodyHtml(callbackFormat) {
        callbackFormat = typeof callbackFormat == "function" ? callbackFormat : e => e;

        this._filter();
        this._sort(this.option.sort.column, this.option.sort.desc);

        let trs = this.filterList.slice(...this._pagging(this.option.currentPage, this.option.pageSize))
            .map(
                e =>
                    `<tr class='table-sortable__body-row'>${callbackFormat(e)
                        .map(i => `<td class='table-sortable__body-cell'>${i}</td>`)
                        .join("")}</tr>`
            )
            .join("");

        let tbody = this.el.querySelector('tbody');
        
        if(tbody)
            tbody.remove();

        let table = this.el.querySelector('table');

        table.insertAdjacentHTML('beforeend', `<tbody>${trs}</tbody>`);

        this._renderPaging();
    };

    _renderPaging(){
        let countPage = Math.ceil(this.filterList.length / this.option.pageSize);
        
        let result = '';

        while(countPage){
            result = `<div class='table-sortable__pagging-element'>${countPage--}</div>${result}`;
        }
        
        let paggingLine = `
        <div class='table-sortable__pagging-box'>
            <div class='table-sortable__pagging-element_prev'><<</div>
            ${result}
            <div class='table-sortable__pagging-element_next'>>></div>
        </div>`;

        let paggingBox = this.el.querySelector('.table-sortable__pagging-box');
        
        if(paggingBox)
            paggingBox.remove();

        this.el.insertAdjacentHTML('beforeend', paggingLine);
    }

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

    table_sortable__input(cls, event) {
        let inputFilter = event.target.closest(cls);

        if (!inputFilter) return;

        this.filter();
    }

    onClick(event) {
        this.strategyOnClick(".table-sortable__head-cell", event);
    }

    onKeyup(event) {
        this.strategyOnClick(".table-sortable__input", event);
    }
}

Object.assign(TableSortable.prototype, Sort, Filter, Pagging, StringWorker);