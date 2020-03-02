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

/**
 * @param {Function} fn
 * @returns {Function} Возвращает каррированную функцию следующего аргумента
*/
function curry(fn, self){
    self = self || this;
	return function curried (...a) {
		if(a.length >= fn.length){
			return fn.apply(self, a);
		} else {
			return (...a2) => {
				return curried.apply(self, [...a, ...a2]);
			};
		}
	}
}

class TableSortable {
    static _createElement(tag, cls){
        let el = document.createElement(tag);
        el.className = cls;
        return el;
    }

    constructor(items, option) {
        this.els = {
            el: TableSortable._createElement("div", "grid-table"),
            head: TableSortable._createElement("div", "grid-table__head"),
            filter: TableSortable._createElement("div", "grid-table__filter"),
            body: TableSortable._createElement("div", "grid-table__body"),
            paging: TableSortable._createElement("div", "grid-table__pagging")
        }

        this.els.el.addEventListener("click", this.onClick.bind(this));
        this.els.el.addEventListener("keyup", this.onKeyup.bind(this));

        this.els.el.append(this.els.head);
        this.els.el.append(this.els.filter);
        this.els.el.append(this.els.body);
        this.els.el.append(this.els.paging);

        this.option = Object.assign({
            nameHead: {},
            pagging: {
                pageSize: 5,
                currentPage: 1,
            },
            sort: {
                column: null,
                desc: false
            }
        }, option, {
            countPage: () => Math.ceil(this.filterList.length / this.option.pagging.pageSize)
        });

        this.option = Object.assign(this.option, {
            countPage: () => Math.ceil(this.filterList.length / this.option.pagging.pageSize)
        });

        this.headNameRow = items.length ? Object.keys(items[0]) : [];
        this.bodyValueRows = items.length
            ? items
            : [];

        this.filterList = this.bodyValueRows
            .slice(...this._pagging(this.option.pagging.currentPage, this.option.pagging.pageSize));

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
        let cells = this.els.filter.querySelectorAll('.grid-table__element-input');

        let indexs = Array.from(cells)
            .filter(e => e.value)
            .map(m => {
                return {
                    index: m.dataset.filterCollumn,
                    value: m.value
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
        this.currentPage(++this.option.pagging.currentPage);
    }

    prevPage(){
        this.currentPage(--this.option.pagging.currentPage);
    }

    currentPage(page){
        this.option.pagging.currentPage = this._isBetween(page, 1, this.option.countPage()) 
            ? page 
            : (1 > page ? 1 : this.option.countPage());
        
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
            let nameCollumn = curr;

            curr = this.option.nameHead[curr] || curr;

            return `${res}<div class='grid-table__element' data-name-collumn='${nameCollumn}'>${callbackFormat([curr])
                .map(e => e)
                .join("")}</div>`;
        }, "");

        this.els.head.innerHTML = '';
        
        this.els.head.insertAdjacentHTML('afterbegin', tds);

        this.els.filter.innerHTML = '';

        this.els.filter.insertAdjacentHTML('afterbegin', this
            .headNameRow
            .reduce((res, curr) => {
                return `${res}<div class='grid-table__element'><input class="grid-table__element-input" data-filter-collumn='${curr}' type="text"/></div>`;
            },''));
    };

    renderBodyHtml(callbackFormat) {
        callbackFormat = typeof callbackFormat == "function" ? callbackFormat : e => e;

        this._filter();
        this._sort(this.option.sort.column, this.option.sort.desc);

        this.option.pagging.currentPage = Math.min(this.option.countPage(), this.option.pagging.currentPage);

        let trs = this.filterList.slice(...this._pagging(this.option.pagging.currentPage, this.option.pagging.pageSize))
            .map(
                e => `<div class='grid-table__col'>${callbackFormat(Object.values(e).map(e => e))
                        .map(i => `<div class='grid-table__element'>${i}</div>`)
                        .join("")}</div>`
            )
            .join("");

        this.els.body.innerHTML = '';

        this.els.body.insertAdjacentHTML('afterbegin', trs);

        this._renderPaging();
    };

    _renderPaging(){
        let countPage = Math.ceil(this.filterList.length / this.option.pagging.pageSize);
        
        let result = '';

        while(countPage){
            let cls = '';
            if(this.option.pagging.currentPage == countPage){
                cls = 'grid-table__element_active';
            } else {
                cls = 'grid-table__element';
            }
            result = `<div class='${cls}' data-page-number=${countPage}>${countPage}</div>${result}`;
            countPage--;
        }
        
        let paggingLine = `
            <div class='grid-table__pagging-element-prev'><<</div>
            ${result}
            <div class='grid-table__pagging-element-next'>>></div>`;

        this.els.paging.innerHTML = '';

        this.els.paging.insertAdjacentHTML('afterbegin', paggingLine);
    }

    grid_table__element(cls, event) {
        let tdHead = event.target.closest(cls);

        if (!tdHead) return;

        let head = event.target.closest('.grid-table__head');

        if (head) {
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
    
            let tds = this.els.el.querySelectorAll(cls);
    
            tds.forEach(td => {
                if (td != tdHead) {
                    td.classList.remove("asc");
                    td.classList.remove("desc");
                }
            });

            this.sort(tdHead.dataset.nameCollumn, desc);
        };

        let padding = event.target.closest('.grid-table__pagging');

        if(padding) {
            this.currentPage(tdHead.dataset.pageNumber);
        }
    }

    grid_table__element_input(cls, event) {
        let inputFilter = event.target.closest(cls);

        if (!inputFilter) return;
        
        this.filter();
    }

    grid_table__pagging_element_prev(cls, event){
        let prev = event.target.closest(cls);

        if (!prev) return;

        this.prevPage();
    }

    grid_table__pagging_element_next(cls, event){
        let next = event.target.closest(cls);

        if (!next) return;

        this.nextPage();
    }

    onClick(event) {
        [
            '.grid-table__pagging-element-prev',
            '.grid-table__pagging-element-next',
            '.grid-table__element',
        ].forEach(cls => {
            this._strategyOnClick(event, cls);
        });
    }

    onKeyup(event) {
        this._strategyOnClick(event, ".grid-table__element-input");
    }

    _strategyOnClick(event, cls) {
        let method = cls.replace(".", "").replace(new RegExp("-", "g"), "_");
        if (this[method]) this[method](cls, event);
    }
}

Object.assign(TableSortable.prototype, Sort, Filter, Pagging, StringWorker);