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
 *     dataTransfer(startIndex,sortItemEle,srcName)  需要返回JSON对象。 紧跟在sortStart后触发。
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

    do {

        if (target === sortRoot) {
            target = null;
            break;
        }
        else if (matchSortItem(target, sortRoot)) {
            break;
        }

    } while (target = target.parentNode)

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

    if (list == null) return '*'

    var result = {
        name: [],
        fn: []
    }

    if (!isArray(list)) {
        result.name = [list + '']
        return result;
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

    var dropAllow = fromGroup.drop;
    var drop = enterGroup.dropAllow;

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

var applyEvent = function (cb, args) {
    // console.log(config, 'triggerevent');
    if (cb) {
        return cb.apply(null, args);
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

var onDragStart = function (ins, targetNode, sortNode) {

    var result = applyEvent(ins.cb.onDragStart, [ins.startIndex, ins.group.name, targetNode, sortNode]);
    if (result !== false && ins.checkDataset) {
        result = !bubbleFind(targetNode, sortNode, function (cur) {
            var $cur = $$(cur);
            return $cur.dataset('ignoreDrag') === 'true' || $cur.dataset('ignoreDnd') === 'true';
        })
    }
    return result;
}
var onDragOver = function (ins, fromGroup, targetNode, sortNode) {

    var result = applyEvent(ins.cb.onDragOver, [fromGroup.name, ins.group.name, targetNode, sortNode]);

    if (result !== false && ins.checkDataset) {
        result = !bubbleFind(targetNode, sortNode, function (cur) {
            var $cur = $$(cur);
            return $cur.dataset('ignoreDrop') === 'true' || $cur.dataset('ignoreDnd') === 'true';
        })
    }
    return result;
}
var onDragEnd = function (ins, startIndex, endIndex, srcName, tarName) {
    console.log('trigger on DragEnd');
    applyEvent(ins.cb.onDragEnd, [startIndex, endIndex, srcName, tarName]);
}

var onTransData = function (ins) {
    var cb = ins.cb.dataTransfer;
    if (cb) {
        return cb(ins.startIndex, ins.$drag[0], ins.group.name);
    }
};

var createExternalItem = function (ins) {
    var $node, cb = ins.cb.template;
    var result = cb && cb(dragSession.get('data'), dragSession.get('group').name, dragSession.get('curName'));
    var clsChosen = dragSession.get('curClassName').chosen;
    if (result) {
        if (typeof result === 'string') {
            $node = $$.create(result);
        }
        else {
            $node = $$(result);
        }
    }
    else {
        console.log('createExternalItem remove chosen', clsChosen)
        $node = dragSession.get('$clone');
        $node.removeClass(clsChosen);
    }

    $node.addClass(ins.className.chosen);

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
     * @param {object} config
     * @param {string} config.clsChosen
     * @param {string} config.clsImage
     * @param {string} config.clsHolder
     * @param {string} config.name
     * @param {(string|function)[]} config.drop
     * @param {(string|function)[]} config.dropAllow
     * @param {function} config.onDragStart - ( startIndex,srcName,targetEle,sortItemEle ) return false,则取消
     * @param {function} config.onDragOver - ( srcName,tarName,tarEle,sortItemEle )       return false,则禁止拖放;
     * @param {function} config.onDragEnd -  ( startIndex,endIndex,srcName,tarName,fixFn ) 当拖动结束,但排序无变化时,endIndex为undefined.
     * @param {function} config.dataTransfer - ( startIndex,sortItemEle,srcName )  需要返回JSON对象。 紧跟在sortStart后触发。
     * @param {function} config.template
     * @param {bool} config.hasHolder
     * @param {bool} config.checkDataset
     */

    constructor(node, config) {

        var $root = this.$root = $$(node);

        $root.find('a,img,input,textarea').each(function (node) {
            node.draggable = false;
        });

        this.className = {
            chosen: config.clsChosen || 'dragChosen',
            image: config.clsImage || 'dragImage',
            holder: config.clsHolder || 'dragHolder'
        };


        this.group = {
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

        bindInstance(this);

        this.listeners = {
            //拖动元素
            mousedown: this.mouseDownCb,
            dragend: this.dragEndCb,

            //放置元素
            dragenter: dragEnterCb,
            dragover: this.dragOverCb,
            drop: dropCb
        }
        delegateSortItem(this.listeners, $root);


        this.hasHolder = config.hasHolder;
        this.checkDataset = config.checkDataset;

        this.cb = {
            onDragStart: config.onDragStart,
            onDragOver: config.onDragOver,
            onDragEnd: config.onDragEnd,
            dataTransfer: config.dataTransfer,
            template: config.template
        }

        this.isDispose = false;

    }

    mouseDownCb(e) {


        var sortItem = closetItem(e.target, this.$root[0]);
        if (!sortItem) return;


        this.startIndex = nodeIndex(sortItem);
        // this.endIndex = undefined;

        if (onDragStart(this, e.target, sortItem) === false) return;

        sortItem.draggable = true;

        this.$drag = $$(sortItem);
        this.$clone = this.$drag.clone(true);

        removeRange();

        delegateSortItem({
            dragstart: this.dragStartCb,
            mouseup: this.clear,
        }, this.$root);

        $$(document).on('drop', dropCb);
    };

    dragStartCb(e) {
        var dt = e.dataTransfer;
        dt.effectAllowed = 'copyMove';

        if (isFireFox) {
            // dt.setData('Text', this.startIndex); //firefox要设置一个值,否则实际不会拖动。
            dt.setData('Text', this.$clone.outerHtml());
        }

        var name = this.group.name;
        var $drag = this.$drag;
        var $clone = this.$clone;

        dragSession.set({
            data: onTransData(this),
            group: this.group,
            $clone: $clone,
            $drag: $drag,
            curName: name,       //当前操作列表，在dragOver中会重置。
            curClassName: this.className,     //在dragOver中会重置。用于在createExternalItem中删除原clsChosen，感觉放在这里不太合适，暂时没有更好的方案，先放在这里。
            prevSortItem: null   //在dragOver中重置，
                                 //  逻辑上对dragover的回调处理一次就可以了，
                                 //  并且当元素clone.chosen的height特别小的时候，多次响应dragover会导致clone闪烁，
                                 //  通过比对前一次preSortItem，避免多次响应dragover

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
                console.log('hide drag');
                $drag.insertAfter($clone).hide();
            }

            $clone.addClass(className.chosen)

        }, 0);

    }

    dragOverCb(e) {

        if (!dragSession.hasData()) {
            return;
        }//不是当前插件托管的拖动

        console.log('dragover');

        var dt = e.dataTransfer;
        dt.dropEffect = 'move';
        e.preventDefault();


        var sortItem = closetItem(e.target, this.$root[0]);
        //如果over的是ul，则此处sortItem为Null

        var prevSortItem = dragSession.get('prevSortItem');
        if (prevSortItem === sortItem) {
            return;
        }
        else {
            console.log(prevSortItem,sortItem);

            dragSession.set({
                prevSortItem: sortItem
            })
        }

        var $operator = dragSession.get('$clone');
        if (sortItem === $operator[0]) return;

        var $drag = this.$drag;
        var fromGroup = dragSession.get('group');

        if (!$drag) { //拖动源不是当前列表:

            // console.log('checkRule',checkDropRule(fromGroup, this.group))
            if (!checkDropRule(fromGroup, this.group)) {
                dt.dropEffect = 'none';
                return;
            }
        }

        if (sortItem && onDragOver(this, fromGroup, sortItem && e.target, sortItem) === false) {
            console.log('dragover: false');
            dt.dropEffect = 'none';
            return;
        }

        var isCross = dragSession.get('curName') !== this.group.name;
        var isSelf = fromGroup.name === this.group.name;


        if (isCross) {
            //首次拖入到其他列表中的情况。
            $operator.remove();

            //从当前列表拖到其他列表 再拖回来
            $operator = isSelf ? this.$clone : createExternalItem(this);
            dragSession.set({
                $clone: $operator,
                curName: this.group.name,
                curClassName: this.className
            });
        }

        if (!isCross && !sortItem) return; //hover ul & 当前列表

        if (!sortItem) { //hover ul & 跨列表
            this.$root.prepend($operator);
            return;
        }

        var $sortItem = $$(sortItem);
        var $prev = $sortItem.prev();
        var $next = $sortItem.next();


        /*
             *在前面已经先判断了，sortItem为clone，则直接返回。
             *
             * if 拖动当前列表
             *       1. sortItem即选中元素，删除clone (只有占位的时候才可能)
             *       2. 选中元素占位 && 前一个元素为选中元素 , 删除clone, (不占位的时候，前一个为选中元素，则继续一个if,因为占位的时候，视觉上先加到前面感觉更合理)
             *       3. 选中元素占位 && 前一个元素是clone， 下一个元素是选中元素
             *       then 删除clone
             * else if 前一个元素是clone
             *       then clone加到sortItem之后
             * else clone加到sortItem之前
              */
        if (isSelf &&
            (
                sortItem === this.$drag[0] ||
                (this.hasHolder && $prev[0] === this.$drag[0]) ||
                (this.hasHolder && $prev[0] === $operator[0] && $next[0] === this.$drag[0])
            )
        ) {
            console.log('remove clone');
            // this.$clone.remove();
            $operator.remove();
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

        console.log($operator.parent());
        var endIndex = $operator.parent().length === 0 ? this.startIndex : nodeIndex($operator[0], $oriDrag[0]);
        var startIndex = this.startIndex;

        var fromName = dragSession.get('group').name;
        var curName = dragSession.get('curName');

        var isCross = fromName !== curName;

        console.log(startIndex, endIndex);
        if (isCross || startIndex !== endIndex) {
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

            onDragEnd(this, startIndex, endIndex, fromName, curName);

        }
        else {
            $operator.remove();
            $oriDrag.show();
        }

    }

    clear() {
        // console.log('clear');
        undelegateSortItem({
            dragstart: this.dragStartCb,
            mouseup: this.clear
        }, this.$root);
        $$(document).off('drop', dropCb);

        if (this.$drag) {
            this.$drag[0].draggable = false;
            this.$drag.removeClass(this.className.holder);
        }

        this.$clone = this.$drag = null;

        dragSession.clear();
        this.startIndex = undefined;
        // endIndex = undefined;
        // crossInsertNode = null;

        this.isDispose = true;
    }

    dispose() {
        if (!this.isDispose) {
            this.clear();
            undelegateSortItem(this.listeners, this.$root);
        }
    }

}


export default function (node, config) {
    return new sortList(node, config).dispose
}


