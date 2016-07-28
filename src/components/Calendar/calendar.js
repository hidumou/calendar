// jshint unused:false

require('./style.scss');


/**
 * 模块处理
 */
(function (win, factory) {
    if (typeof define === 'function' && define.amd) {
        define('calendar', factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        win.Calendar = factory();
    }
})(this, function () {

    /**
     * 构造器
     * @param opt
     * @constructor
     */
    function Calendar(opt) {
        this.defaults = {
            monthNames: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
            dayNames: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
            holiday: {
                '2.23': '2B青年节',
                '3.8': '妇女节',
                '5.1': '黄金周^_~',
                '5.4': '青年节' //balabala。。。。
            },
            weekendTipMsg: '马上放假~',
            workTipMsg: '工作日',
            currentDate: new Date(),
            maxDate: 2020,
            container: document.body
        };

        this.init(opt);
    }

    var proty = Calendar.prototype;

    /**
     * 初始化
     */
    proty.init = function (opt) {

        if (typeof opt === 'string') {
            this.defaults.container = this.dom.byId(opt);
        } else {
            Tools.extend(this.defaults, opt);
            if (opt && opt.container) {
                this.defaults.container = this.dom.byId(opt.container);
            }
        }

        this.task = {}; //记录所创建任务
        this.selectYearId = Math.random().toString(36).substring(3, 8);//年 id
        this.selectMonthId = Math.random().toString(36).substring(3, 8);//月 id
        this.dateContainerId = Math.random().toString(36).substring(3, 8); //日期主容器 id

        if (typeof this.defaults.currentDate === 'string') {
            //todo IE8 兼容问题
            var arr = this.defaults.currentDate.split("-");
            this.defaults.currentDate = new Date(Date.UTC(+arr[0], +arr[1] - 1, +arr[2]));
        }

        this.createCalendar();
    };


    /**
     * 创建日历容器
     */
    proty.createCalendar = function () {
        this.calendar = this.dom.create('div');
        this.calendar.className = 'calendar';

        //添加年月
        this.createYearAndMonth();

        //添加日历头
        this.createCalendarHeader();

        //添加日期,默认为当前日期
        this.createDate();

        // innerHTML = ''; can't work in IE8 ....
        this.dom.removeAllChild(this.defaults.container);

        this.defaults.container.appendChild(this.calendar);

        this.bindEvent();
    };

    /**
     * 创建年份,月份容器
     */
    proty.createYearAndMonth = function () {
        var selectYearAndMonthAreaDom = this.dom.create('div');
        selectYearAndMonthAreaDom.className = 'selectArea';
        selectYearAndMonthAreaDom.appendChild(this.createYear());
        selectYearAndMonthAreaDom.appendChild(this.createMonth());
        this.calendar.appendChild(selectYearAndMonthAreaDom);
    };

    /**
     * 创建日历头部星期
     * @returns {string}
     */
    proty.createCalendarHeader = function () {
        var calendarHeader = this.dom.create('ul'),
            weekText = this.defaults.dayNames;

        calendarHeader.className = 'header';
        for (var i = 0; i < weekText.length; i++) {
            var oLi = this.dom.create('li');
            oLi.innerText = weekText[i];
            calendarHeader.appendChild(oLi);
        }
        this.calendar.appendChild(calendarHeader);
    };

    /**
     * 创建年份
     */
    proty.createYear = function () {
        var year = this.dom.create('select');

        this.dom.setAttr(year, 'id', this.selectYearId);
        year.className = 'year-list';

        //生成年份
        for (var i = 1990; i <= (this.defaults.maxDate || this.defaults.currentDate.getFullYear()); i++) {
            var o = this.dom.create("option"), t = document.createTextNode(i);
            o.setAttribute("value", i);
            o.appendChild(t);
            if (i === this.defaults.currentDate.getFullYear()) {
                o.setAttribute('selected', true);
            }
            year.appendChild(o);
        }
        return year;
    };

    /**
     * 创建月份
     */
    proty.createMonth = function () {
        var month = this.dom.create('ul'),
            monthArr = this.defaults.monthNames;

        month.setAttribute('id', 'month');
        month.className = 'month-list';
        this.dom.setAttr(month, 'id', this.selectMonthId);

        for (var i = 0; i < monthArr.length; i++) {
            var oLi = this.dom.create('li');
            oLi.innerText = monthArr[i];
            this.dom.setAttr(oLi, 'value', i);
            if (i == this.defaults.currentDate.getMonth()) {
                oLi.className = 'active';
            }
            month.appendChild(oLi);
        }

        return month;
    };

    /**
     * 创建日期
     */
    proty.createDate = function () {
        var table = this.dom.byId(this.dateContainerId) || this.dom.create('table');
        table.className = 'main';
        table.setAttribute('cellspacing', 8);
        table.setAttribute('id', this.dateContainerId);
        this.dom.removeAllChild(table);
        var arr = this.inserData();

        var index = 0;
        for (var j = 1; j <= Math.ceil(arr.length / 7); j++) {
            var oTr = this.dom.create('tr');
            for (var i = 1; i < 8; i++) {
                var data = arr[index++],
                    oTd = this.dom.create('td'),
                    date = this.dom.create('span');

                date.className = 'date';
                oTd.className = this.processTdClass(data);
                date.innerText = data.str;
                oTd.appendChild(date);
                this.dom.setAttr(oTd, 'ymd', data.date);
                this.processTd(oTd, data);
                oTr.appendChild(oTd);
            }
            table.appendChild(oTr);
        }

        this.calendar.appendChild(table);

    };

    /**
     * 插入日历数据
     * 思路 前一月的数组 + 当前月数组 + 下一个月数组
     * @param d 日期
     */
    proty.inserData = function (d) {
        var currentDate = d || this.defaults.currentDate, _this = this;
        var first_daye_of_current_month = this.getFirstDay(currentDate);

        var current_month = {
            //前一个月的偏差值
            preMonthOffset: first_daye_of_current_month ? first_daye_of_current_month : 7 - first_daye_of_current_month,
            endDate: this.getDaysOfMonth(currentDate)
            //后一个月偏差值 : a.硬编码计算(至少大于当前月份所能否显示列数) b.Math.ceil((前一个月的偏差量 + 当前月的天数动态计算)/7)*7 - (前一个月的偏差量 + 当前月的天数动态计算);
        };

        //获取前一个月所显示的数据
        var tempDate = null;
        var preMonth = Tools.createArr(current_month.preMonthOffset).map(function () {
            if (!tempDate) {
                //默认为当前月的第一天
                tempDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1));
            }
            tempDate = Tools.addDayNum(tempDate, -1); //-1 计算前一天 1 后一天

            return _this.processDate(tempDate, currentDate, true);
        }).reverse();


        tempDate = null;
        //获取当前月数据
        var currentMonth = Tools.createArr(current_month.endDate).map(function () {
            if (!tempDate) {
                tempDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1));
            } else {
                tempDate = Tools.addDayNum(tempDate, 1);
            }

            return _this.processDate(tempDate, currentDate, false);
        });

        tempDate = null;
        //计算总行数
        var rowNum = Math.ceil((current_month.endDate + preMonth.length) / 7);

        //获取下一个月可显示数据 总cell数 -  (前一个月 + 当前月)
        var nextMonth = Tools.createArr(7 * rowNum - (current_month.endDate + preMonth.length)).map(function () {
            if (!tempDate) {
                tempDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
            } else {
                tempDate = Tools.addDayNum(tempDate, 1);
            }

            return _this.processDate(tempDate, currentDate, true);
        });

        return preMonth.concat(currentMonth, nextMonth);
    };

    /**
     * 绑定事件
     */
    proty.bindEvent = function () {
        var year = this.dom.byId(this.selectYearId),
            month = this.dom.byId(this.selectMonthId),
            calendarTable = this.dom.byId(this.dateContainerId),
            _this = this;

        //选择年
        Tools.addEve(year, 'change', function (e) {
            _this.updateView();
        });

        //选择月
        Tools.addEve(month, 'click', function (e) {
            //事件绑定在 UL 上!~
            if((e.target || e.srcElement).nodeName!=='LI'){return;}

            var allChild = month.childNodes;
            //remove Class
            for (var i = 0; i < allChild.length; i++) {
                allChild[i].className = '';
            }
            (e.target || e.srcElement).className = 'active';
            _this.updateView();
        });

        //创建任务事件
        Tools.addEve(calendarTable, 'click', function (e) {
            _this.createTask((e.target || e.srcElement));
        });
    };

    /**
     * 更新日历
     */
    proty.updateView = function () {
        var year = this.dom.byId(this.selectYearId),
            month = this.dom.byId(this.selectMonthId);
        var monthVal = this.defaults.currentDate.getMonth();
        for (var i = 0; i < month.childNodes.length; i++) {
            if (Tools.hasClass(month.childNodes[i], 'active')) {
                monthVal = this.dom.getAttr(month.childNodes[i], 'value');
                break;
            }
        }
        this.defaults.currentDate = new Date(Date.UTC(year.value, +monthVal, this.defaults.currentDate.getDate()));

        this.createDate();
    };

    /**
     * 根据月份获取当前日历行数
     * @param date
     * @returns {number}
     */
    proty.getCalendarColNumsByMonth = function (date) {
        return Math.ceil(this.getDaysOfMonth(date) / 7);
    };


    /**
     * 获取月份的天数
     * @param date
     * @returns {number}
     * http://www.w3schools.com/jsref/jsref_setdate.asp
     * 0 will result in the last day of the previous month
     */
    proty.getDaysOfMonth = function (date) {
        return new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0)).getDate();
    };

    /**
     * 获取一年中某一月份的第一天为周几
     * @param date
     * @returns {number}
     */
    proty.getFirstDay = function (date) {
        return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1)).getDay();
    };

    /**
     * 日期数据处理
     * 是否为节假日,周末等等...
     * 是否设有任务...
     * @param date
     * @param currentDate
     * @param disabled
     */
    proty.processDate = function (date, currentDate, disabled) {
        //优化
        var d = new Date();
        return {
            str: Tools.formatDate(date.getTime(), 10),//页面显示数据
            current: date.getTime() === new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())).getTime(), //是否为今天
            date: Tools.formatDate(date.getTime(), 6),//各个时间
            isWeekend: (date.getDay() === 0 || date.getDay() === 6),//是否是周末
            holiday: this.isHoliday(date),//是否为节假日
            disabled: disabled, //是否高亮显示标示,
            task: this.getTask(date),//当前日期的任务,
            isShowRightTopMsg: {
                isShow: ~~(Math.random() * 2),
                msg: ['请病假', '头晕', '无聊', '-_-||'][~~(Math.random() * 4)]
            }
        };
    };

    /**
     * 日期单独样式处理
     */
    proty.processTdClass = function (data) {
        var className = 'day';

        //周末
        if (data.isWeekend) {
            className += ' week';
        }

        //节假日
        if (data.holiday && data.holiday.isHoliday) {
            className += ' holiday';
        }

        //当天
        if(data.current){
            className += ' active';
        }

        //当前月
        if(data.disabled){
            className += ' disabled';
        }
        return className;
    };

    /**
     * 处理 TD 中的 DOM
     * 添加节假日,任务...
     * @param td
     * @param data
     */
    proty.processTd = function (td, data) {
        //节假日
        if (data.holiday.isHoliday) {
            this.createTdLabel(td, data.holiday.text);
        }

        //工作日
        if (!data.isWeekend && !data.holiday.isHoliday) {
            var bg = ['#f3faf0', '#ffeee6', '#eaf8fe', '#fff7e6', '#87d068'][~~(Math.random() * 5)];
            this.createTdLabel(td, data.isShowRightTopMsg.isShow ? data.isShowRightTopMsg.msg : this.defaults.workTipMsg, 'right-top', bg);
            this.createTdLabel(td, this.defaults.workTipMsg);
        }

        //周末
        if (data.isWeekend) {
            this.createTdLabel(td, this.defaults.weekendTipMsg);
        }

        //还原任务
        if (data.task.length) {
            var task = this.dom.create('ul');
            task.className = 'task';
            for (var i = 0; i < data.task.length; i++) {
                var taskItem = this.dom.create('li');
                taskItem.innerText = data.task[i];
                taskItem.style.cssText = 'background:' + (['#f3faf0', '#ffeee6', '#eaf8fe', '#fff7e6'][~~(Math.random() * 4)]);
                task.appendChild(taskItem);
            }
            td.appendChild(task);
        }
    };
    /**
     * 是否为节假日
     * @param date
     */
    proty.isHoliday = function (date) {
        var holidayInfo = this.defaults.holiday[date.getMonth() + 1 + '.' + date.getDate()];
        return {
            isHoliday: !!holidayInfo,
            text: holidayInfo ? holidayInfo : ''
        };
    };

    /**
     * 创建Label
     */
    proty.createTdLabel = function (parent, txt, className, bg) {
        //<label class="right-bottom">节假日</label>
        var oL = this.dom.create('label');
        oL.innerText = txt;
        oL.className = className || 'right-bottom';
        oL.style.cssText = 'background:' + bg;
        parent.appendChild(oL);
    };

    /**
     * 获取对应日期的所保存的任务
     * @param date
     * @returns {{isHoliday: boolean, text: string}}
     */
    proty.getTask = function (date) {
        return this.task[Tools.formatDate(date.getTime(), 6)] || [];
    };

    /**
     * 添加任务
     * @param el
     * @param str
     */
    proty.createTask = function (el, str) {
        var taskText = str || prompt("Hey, buddy! 你想记个啥?");
        if (!taskText) {
            return;
        }

        //当期那日期存已创建任务,无需再次创建,添加即可
        if (!this.task[this.dom.getAttr(el, 'ymd')]) {
            this.task[this.dom.getAttr(el, 'ymd')] = [];
        }
        (this.task[this.dom.getAttr(el, 'ymd')]).push(taskText);

        var task = el.getElementsByTagName('ul')[0] || this.dom.create('ul');
        task.className = 'task';

        var taskItem = this.dom.create('li');
        taskItem.innerText = taskText;
        taskItem.style.cssText = 'background:' + (['#f3faf0', '#ffeee6', '#eaf8fe', '#fff7e6'][~~(Math.random() * 4)]);

        task.appendChild(taskItem);
        el.appendChild(task);
    };


    /**
     * dom 操作
     * @returns {Element}
     */
    proty.dom = {
        create: function (ele) {
            return document.createElement(ele);
        },
        byId: function (id) {
            return document.getElementById(id);
        },
        getAttr: function (el, attr) {
            return el.getAttribute(attr);
        },
        setAttr: function (el, attr, val) {
            return el.setAttribute(attr, val);
        },
        removeAllChild:function (ele) {
            while (ele.hasChildNodes()){
                ele.removeChild(ele.lastChild);
            }
        }
    };


    return Calendar;
});







//Array.map IE Polyfill
if (!Array.prototype.map) {
    Array.prototype.map = function (callback, thisArg) {
        var T, A, k;
        var O = Object(this);
        var len = O.length;
        if (arguments.length > 1) {
            T = thisArg;
        }
        A = new Array(len);
        k = 0;
        while (k < len) {
            var kValue, mappedValue;
            if (k in O) {
                kValue = O[k];
                mappedValue = callback.call(T, kValue, k, O);
                A[k] = mappedValue;
            }
            k++;
        }
        return A;
    };
}

//Date.format
Date.prototype.format = function (c) {
    c = c || "";
    if (isNaN(this)) {
        return "";
    }
    var b = {
        "m+": this.getMonth() + 1,
        "d+": this.getDate(),
        "h+": this.getHours(),
        "n+": this.getMinutes(),
        "s+": this.getSeconds(),
        S: this.getMilliseconds(),
        W: ["日", "一", "二", "三", "四", "五", "六"][this.getDay()], "q+": Math.floor((this.getMonth() + 3) / 3)
    };
    if (c.indexOf("am/pm") >= 0) {
        c = c.replace("am/pm", (b["h+"] >= 12) ? "下午" : "上午");
        if (b["h+"] >= 12) {
            b["h+"] -= 12;
        }
    }
    if (/(y+)/.test(c)) {
        c = c.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (var a in b) {
        if (new RegExp("(" + a + ")").test(c)) {
            c = c.replace(RegExp.$1, RegExp.$1.length == 1 ? b[a] : ("00" + b[a]).substr(("" + b[a]).length));
        }
    }
    return c;
};


/**
 * 简单工具类
 */
var Tools = {
    hasProperty: Object.prototype.hasOwnProperty,

    /**
     * Copy
     */
    extend: Object.assign || function (target) {
        for (var i = 1; i < arguments.length; i++) {
            var source = arguments[i];
            for (var key in source) {
                if (this.hasProperty.call(target, key)) {
                    target[key] = source[key];
                }
            }
        }
        return target;
    },
    /**
     * 添加事件
     * @param obj
     * @param type
     * @param fn
     * @param isCap
     */
    addEve: function (obj, type, fn, isCap) {
        if (obj.addEventListener) {//W3C
            obj.addEventListener(type, fn, isCap || false);
        } else if (obj.attachEvent) {//IE
            obj.attachEvent('on' + type, fn);
        }
    },
    /**
     * 移除事件
     * @param obj
     * @param type
     * @param fn
     */
    removeEve: function (obj, type, fn) {
        if (obj.removeEventListener) {
            obj.removeEventListener(type, fn, false);
        } else if (obj.detachEvent) {
            obj.detachEvent("on" + type, fn);
        }
    },
    /**
     * 创建数组
     * @param length
     * @returns {Array}
     */
    createArr: function (length) {
        var range = new Array(length);
        for (var idx = 0; idx < length; idx++) {
            range[idx] = idx;
        }
        return range;
    },
    /**
     * 判断某个对象是否有指定的className
     * @param ele
     * @param cls
     */
    hasClass: function (ele, cls) {
        return ele.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));
    },

    /**
     * 给指定对象添加className
     * @param ele
     * @param cls
     */
    addClass: function (ele, cls) {
        if (!hasClass(ele, cls)) ele.className += " " + cls;
    },

    /**
     * 删除className
     * @param ele
     * @param cls
     */
    removeClass: function (ele, cls) {
        if (hasClass(ele, cls)) {
            var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
            ele.className = ele.className.replace(reg, ' ');
        }
    },
    /**
     * 增减天数 返回日期
     * @param date
     * @param dayNums
     * @returns {*|{}|{year, month, date}}
     */
    addDayNum: function (date, dayNums) {
        return new Date(date.getTime() + (1000 * 60 * 60 * 24 * dayNums));
    },

    /**
     * 格式化时间
     * @param time
     * @param type
     * @returns {*}
     */
    formatDate: function (time, type) {
        var pattern = "yyyy-mm-dd hh:nn";
        switch (type) {
            case 1:
                pattern = "yyyy年mm月dd日";
                break;
            case 2:
                pattern = "hh:nn";
                break;
            case 3:
                pattern = "yyyy.mm.d";
                break;
            case 4:
                pattern = "yyyy-mm-dd hh:nn:ss";
                break;
            case 5:
                pattern = "yyyy年mm月";
                break;
            case 6:
                pattern = "yyyy-mm-dd";
                break;
            case 7:
                pattern = "yyyy年mm月dd日 hh:nn";
                break;
            case 8:
                pattern = "mm月dd日";
                break;
            case 9:
                pattern = "mm月dd日 hh:nn";
                break;
            case 10:
                pattern = "mm-dd";
                break;
            case 0:
                pattern = "yyyy/mm/dd";
                break;
            default:
                pattern = !!type ? type : pattern;
                break;
        }
        if (isNaN(time) || time === null) {
            return '';
        }

        if (typeof (time) == 'object') {
            var y = dd.getFullYear(), m = dd.getMonth(), d = dd.getDate();
            if (m < 10) m = '0' + m;
            return new Date(Date.UTC(y, m, d)).format(pattern);
        } else {
            return new Date(parseInt(time)).format(pattern);
        }
    }
};
