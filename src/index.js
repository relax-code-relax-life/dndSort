/**
 * Created by wangweilin on 2016/12/21.
 *
 * todo: 动画效果 , 碰撞检测
 */

/**
 * 在排序项的直接父节点上加载插件。
 *
 * options:
 *      onDragStart( startIndex,srcName,targetEle,sortItemEle ) return false,则取消
 *      onDragOver ( srcName,tarName,tarEle,sortItemEle)       return false,则禁止拖放;
 *      onDragEnd  ( startIndex,endIndex,srcName,tarName,fixFn) 当拖动结束,但排序无变化时,endIndex为undefined.
 *                                  fixFn: 当要配合scope.$refresh()时候,跨列表拖动的元素不在bowlder的托管下,$refresh之后会多一个元素,执行fixFn()进行删除。
 *
 *     transData(startIndex,sortItemEle,srcName)  需要返回JSON对象。 紧跟在sortStart后触发。
 *     template(data,srcName,tarName)         当扩列表拖动时，当前列表收到其他列表的拖动，会触发该回调,传入data为transData返回的data
 *
 *     clsChosen:   选中时的样式: 默认dragChosen
 *     clsImage:    拖动的样式:默认dragImage
 *     clsHolder:   源元素项占位的holder的样式。默认为dragHolder
 *
 *     name:''  {String} 当前排序列表名称
 *     drop:['name1',function(tarName)] 限制 当前列表项 可以拖动到其他的列表。默认可以拖动到任何列表。
 *     dropAllow:['name1',function(srcName)]  限制当前列表项 允许 接收dropAllow指定的列表中的元素。 默认可以接收任何列表。
 *                  先检查dropAllow, 在判断drop.
 *
 *     hasHolder:false {bool} 原位置是否显示占位
 *     checkDataset:false {bool} 默认不检查元素属性
 *
 *
 * 元素属性:
 *  data-ignore-drag不允许拖动 作用在li及li下的任何元素.
 *  data-ignore-drop 不允许放置 作用在li元素
 *  data-ignore-dnd 不允许拖动 且 不允许放置
 *
 *  以事件返回为主,如果事件没有返回false,则根据元素属性判断。
 *
 */

/**
 * 代码注意:
 * 在drop里执行元素的移动,而不是在dragend的原因是:
 *      系统默认会有一个 鼠标上图形向原元素移动的动画。在drop里删除掉dragEle则可以避免该有歧义的动画。
 *
 * 仍然改为在dragend里处理元素的移动,在drop需要额外处理document上的drop事件,以及可能其他潜在的问题,为了以上的问题做这种兼容不划算。
 *
 * node节点命名规则：
 *      帮助函数里，以node元素优先。
 *      dragSession和sortList实例上，有关节点的，全部保存为"wwl-dom"对象。
 *
 * */


import dragSession from './session';
import $$ from 'wwl-dom'

const isFireFox = navigator.userAgent.indexOf("Firefox") > 0;

var matchSortItem = function (node, sortRoot) {
    return node.parentNode === sortRoot;
};

var closetItem = function (target, sortRoot) {

    while (target && !matchSortItem(target, sortRoot)) {
        if (target === sortRoot) {
            target = null;
            break;
        }
        target = target.parentNode;
    }
    return target;
};

var delegateSortItem = function (hash, $node) {

    Object.keys(hash).forEach(function (key) {
        $node.on(key, hash[key]);

    });

};
var undelegateSortItem = function (hash, $node) {
    Object.keys(hash).forEach(function (key) {
        $node.off(key, hash[key]);
    })
};

var nodeIndex = function (node, filterNode) {
    var result = 0;
    while (node = node.previousSibling) {

        if (node.nodeType === 1 && node !== filterNode) {
            result++;
        }
    }
    return result;
};

var removeRange = function () {
    try {
        if (document.selection) {
            // Timeout neccessary for IE9
            setTimeout(function () {
                document.selection.empty();
            });
        } else {
            window.getSelection().removeAllRanges();
        }
    } catch (e) {
    }
};

var parseDropRule = function (list) {

    if (!isArray(list)) return '*';

    var result = {
        name: [],
        fn: []
    }
    list.forEach(item => {
        if (typeof item === 'string') {
            result.name.push(item);
        }
        else if (typeof item === 'function') {
            result.fn.push(item);
        }
    });
    return result;
}
var checkDropRule = function (fromGroup, enterGroup) {

    var dropAllow = fromGroup.dropAllow;
    var drop = enterGroup.drop;

    var fromName = fromGroup.name;
    var enterName = enterGroup.name;

    if (dropAllow !== '*') {
        //找到dropAllow 或者 dropAllowFn允许，返回true,
        //else 返回false

        return dropAllow.name.includes(enterName) || dropAllow.fn.some(function (fn) {
            return fn(enterName)
        })
    }
    else if (drop !== '*') {
        //找到 drop 或者 dropFn 允许，返回true.
        //else 返回false
        return drop.name.includes(fromName) || drop.fn.some(function (fn) {
            return fn(fromName)
        });
    }
    else {
        // drop , dropAllow 都为 *
        return true;
    }
}


var isArray = Array.isArray;


var dragEnterCb = function (e) {
    if (dragSession.hasData()) {
        // console.log('dragenter');
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
}
var dropCb = function (e) {

    // console.log('drop cb');

    if (!dragSession.hasData()) {
        return;
    }

    e.preventDefault();
    e.stopPropagation();

};

var triggerEvent = function (config, eventName, args) {
    if (config[eventName]) {
        return config[eventName].apply(null, args);
    }
}
var bubbleFind = function (target, sortNode, fn) {
    var result;
    do {
        result = fn(target);
        if (result) break;
    } while (target !== sortNode && (target === target.parentNode))
    return result;
}

var onDragStart = function (config, checkDataset, startIndex, srcName, targetNode, sortNode) {
    var result = triggerEvent(config, 'onDragStart', [startIndex, srcName, targetNode, sortNode]);
    if (result !== false && checkDataset) {
        result = !bubbleFind(targetNode, sortNode, function (cur) {
            var $cur = $$(cur);
            return $cur.dataset('ignoreDrag') === 'true' || $cur.dataset('ignoreDnd') === 'true';
        })
    }
    return result;
}
var onDragOver = function (config, checkDataset, srcName, tarName, targetNode, sortNode) {
    var result = triggerEvent('onDragOver', [srcName, tarName, targetNode, sortNode]);
    if (result !== false && checkDataset) {
        result = !bubbleFind(targetNode, sortNode, function (cur) {
            var $cur = $$(cur);
            return $cur.dataset('ignoreDrop') !== 'true' && $cur.dataset('ignoreDnd') !== 'true';
        })
    }
    return result;
}
var onDragEnd = function (config, startIndex, endIndex, srcName, tarName) {
    triggerEvent('onDragEnd', [startIndex, endIndex, srcName, tarName]);
}

var onTransData = function (config, startIndex, sortItem, srcName) {
    if (config.transData) return config.transData(startIndex, sortItem, srcName);
};

var createExternalItem = function (config, className) {
    var $node;
    if (config.template) {
        $node = $$(
            config.template(dragSession.get('data'), dragSession.get('group').name, dragSession.get('curName'))
        );
    }
    else {
        $node = dragSession.get('$clone');
    }

    $node.addClass(className);

    return $node;
}

var bindInstance = function (ins) {

    var proto = sortList.prototype;
    var methods = Object.getOwnPropertyNames(proto);

    methods.forEach(method => {
        if (method === 'constructor') return;
        else if (typeof proto[method] === 'function') {
            ins[method] = ins[method].bind(ins);
        }
    })
}

class sortList {
    /**
     *
     * @param node
     * @param config { clsChosen,clsImage,clsHolder,name,drop,dropAllow,onDragStart,onDragOver,onDragEnd,transData,hasHolder,checkDataset }
     */
    constructor(node, config) {

        console.log('constructor')

        var $root = this.$root = $$(node);

        $root.find('a,img,input,textarea').each(function (node) {
            node.draggable = false;
        });


        this.className = {
            chosen: config.clsChosen || 'dragChosen',
            image: config.clsImage || 'dragImage',
            holder: config.clsHolder || 'dragHolder'
        };


        this.groupInfo = {
            name: config.name || dragSession.getGuid(),
            drop: parseDropRule(config.drop),
            dropAllow: parseDropRule(config.dropAllow)
        };


        this.startIndex = undefined;
        // this.endIndex = undefined;
        this.$drag = null;
        this.$clone = null;

        //delegateSortItem :  在$root上绑定事件，并没有对事件做selector筛选。
        //实例方法作为事件监听，会改变this

        // this.dragStartCb = this.dragStartCb.bind(this);
        // this.clear = this.clear.bind(this);
        // this.mouseDownCb = this.mouseDownCb.bind(this);
        // this.dragEndCb = this.dragEndCb.bind(this);
        // this.dragOverCb = this.dragOverCb.bind(this);
        // this.dispose = this.dispose.bind(this);

        bindInstance(this);

        delegateSortItem({
            //拖动元素
            mousedown: this.mouseDownCb,
            dragend: this.dragEndCb,

            //放置元素
            dragenter: dragEnterCb,
            dragover: this.dragOverCb,
            drop: dropCb
        }, $root);


        this.cb = {
            onDragOver: config.onDragOver,
            onDragEnd: config.onDragEnd,
            transData: config.transData,
            template: config.template
        }

        this.hasHolder = config.hasHolder;
        this.checkDataset = config.checkDataset;

    }

    mouseDownCb(e) {


        var sortItem = closetItem(e.target, this.$root[0]);
        if (!sortItem) return;

        console.log('mousedown')

        this.startIndex = nodeIndex(sortItem);
        // this.endIndex = undefined;

        if (onDragStart(this.cb, this.checkDataset, this.startIndex, this.groupInfo.name, e.target, sortItem) === false) return;

        sortItem.draggable = true;

        this.$drag = $$(sortItem);
        this.$clone = this.$drag.clone(true);

        removeRange();

        delegateSortItem({
            dragstart: this.dragStartCb.bind(this),
            mouseup: this.clear.bind(this)
        }, this.$root);

        $$(document).on('drop', dropCb);
    };

    dragStartCb(e) {
        var dt = e.dataTransfer;
        dt.effectAllowed = 'copyMove';

        if (isFireFox) {
            dt.setData('Text', this.startIndex); //firefox要设置一个值,否则实际不会拖动。
        }

        var name = this.groupInfo.name;
        var $drag = this.$drag;
        var $clone = this.$clone;

        dragSession.set({
            data: onTransData(this.cb, this.startIndex, $drag[0], name),
            group: this.groupInfo,
            $clone: $clone,
            $drag: $drag,
            curName: name
        });

        var className = this.className;

        $drag.addClass(className.image);

        // console.log('drag start');

        //hasHolder : dragEle添加holder样式
        //else :    添加cloneEle,隐藏dragEle
        setTimeout(() => {

            $drag.removeClass(className.image);

            if (this.hasHolder) {
                $drag.addClass(className.holder);
            }
            else {
                $drag.insertAfter($clone).hide();
            }

            $clone.addClass(className.chosen)

        }, 0);

    }

    dragOverCb(e) {

        if (!dragSession.hasData()) {
            return;
        }//不是当前插件托管的拖动

        // console.log('dragover');

        var dt = e.dataTransfer;
        dt.dropEffect = 'move';
        e.preventDefault();


        var sortItem = closetItem(e.target, this.$root[0]);

        //如果over的是ul，则此处sortItem为Null
        //此处不用判断sortItem==e.target.
        //因为不管是触发的那个子元素的dragover,当前都已经冒泡到了li,当前处理元素为Li


        var $operator = dragSession.get('$clone');
        if (sortItem === $operator[0]) return;

        var $drag = this.$drag;

        if (!$drag) { //拖动源不是当前列表:

            if (!checkDropRule(dragSession.get('group'), this.groupInfo)) {
                dt.dropEffect = 'none';
                return;
            }
        }

        var fromGroup = dragSession.get('group');

        if (sortItem && onDragOver(this.cb, this.checkDataset, fromGroup.name, this.groupInfo.name, sortItem && e.target, sortItem) === false) {
            dt.dropEffect = 'none';
            return;
        }

        var isCross = dragSession.get('curName') !== this.groupInfo.name;

        if (isCross) {
            //首次拖入到其他列表中的情况。
            dragSession.get('$clone').remove();

            //从当前列表拖到其他列表 再拖回来
            $operator = fromGroup.name === this.groupInfo.name ? this.$clone : createExternalItem(this.cb, this.className.chosen);
            dragSession.set({
                $clone: $operator,
                curName: this.groupInfo.name
            });
        }

        if (!isCross && !sortItem) return; //当前列表拖动 且 hover ul

        if (!sortItem) { //跨列表拖动 且 over的ul
            this.$root.prepend($operator);
            return;
        }


        var $sortItem = $$(sortItem);
        var $prev = $sortItem.prev();

        if (this.$drag && (sortItem === this.$drag[0] || (this.hasHolder && $prev[0] === this.$drag[0]))) {
            console.log('remove clone');
            this.$clone.remove();
            return;
        }

        // console.log('dragover insert');

        if ($prev[0] === $operator[0]) {
            $sortItem.insertAfter($operator);
        }
        else {
            $sortItem.insertBefore($operator);
        }

    }

    dragEndCb(e) {
        // console.log('dragend');
        this.moveDnd();
        this.clear();
    }

    moveDnd() {
        var $operator = dragSession.get('$clone');
        var $oriDrag = dragSession.get('$drag');

        var endIndex = nodeIndex($operator[0], $oriDrag[0]);

        var fromName = dragSession.get('group').name;
        var curName = dragSession.get('curName');

        var isCross = fromName !== curName;

        if (isCross || this.startIndex !== endIndex) {
            // console.log('isCross', isCross, oriDragEle);
            if (isCross) {
                $oriDrag.remove();
                $operator.removeClass(this.className.chosen)
                // crossInsertNode = operateNode;
            }
            else {
                $operator.replace($oriDrag);
                $oriDrag.show();
            }

            onDragEnd(this.startIndex, endIndex, fromName, curName);

        }
        else {
            $operator.remove();
            $oriDrag.show();
        }

    }

    clear() {
        // console.log('clear');
        undelegateSortItem({dragstart: this.dragStartCb, mouseup: this.clear}, this.$root);
        $$(document).off('drop', dropCb);

        this.$drag[0].draggable = false;
        this.$drag.removeClass(this.className.holder);
        this.$clone = this.$drag = null;

        dragSession.clear();
        this.startIndex = undefined;
        // endIndex = undefined;
        // crossInsertNode = null;
    }

    dispose() {
        this.clear();
        undelegateSortItem({}, this.$root);
    }

}


export default function (node, config) {
    new sortList(node, config);
}