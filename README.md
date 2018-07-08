拖动排序，支持跨列表拖动排序。
1. 目前仅支持加载到ul标签上,实现对li标签的拖动排序。
2. 目前仅支持鼠标操作，不支持手势操作。


# 下载

- npm: `npm install -S dndsort`
- 直接下载: `<script src="http://wangwl.net/static/demo/dndsort/index.js"></script>` 

# 使用

- es2015: `import dndSort from 'dndsort'`
- commonjs: `var dndSort = require('dndsort')`
- amd: `define(['./dndsort'],function(dndSort){ /*...*/ })`
- window.dndSort: `<script src="http://wangwl.net/static/demo/dndsort/index.js"></script>` 

# 示例
```javascript
  var dispose=dndSort(document.querySelector('ul#list'));
```

# demo
[http://wangwl.net/static/demo/dndSort/demo.html](http://wangwl.net/static/demo/dndSort/demo.html)

# 函数签名

`function drag( node, options )`

- node: {element|string} 必填。拖动排序的目标元素。传入一个元素或者选择器。
- options: {object} 可选。相关配置参数。

# 函数返回值

```javascript
var dispose = dndSort(document.querySelector('ul#list'));
typeof dispose === 'function';  //true
```

返回function类型，用于释放资源(取消事件监听等)。 

例如，在Vue的`beforeDestroy`和React的`componentWillUnmount`中需要调用`dispose()`。


# options参数

`{ hasHolder, clsChosen, clsImage, clsHolder, name, drop, dropAllow, onDragStart, onDragOver, onDragEnd, checkDataset, dataTransfer, template, }`

### hasHolder
{boolean} 默认为false

原位置是否显示占位

### clsChosen
{string} 默认dragChosen

选中项的样式类

### clsImage
{string} 默认为dragImage

拖动过程中的样式

### clsHolder
{string} 默认为dragHolder

原位置占位元素的样式

### name 
{string} 默认为随机字符串

代表当前拖动排序示例的唯一名称，配合`drop`和`dropAllow`参数使用。

### drop
{Array.<string|function>} 默认为空数组: []

限制 当前列表项 可以拖动到哪些列表里。默认可以拖动到任何列表。

如果参数数组项传入字符串，则代表实例名称，实例名称通过`name`参数配置。
如果参数数组项传入函数，则会传入会传入当前即将进入的实例名称，返回true则代表允许进入。例如:
```javascript
//#list4中的列表项只能拖动到#list1和#list2中
dndSort(document.getElementById('#list1'),{name:'list1'});
dndSort(document.getElementById('#list2'),{name:'list2'});
dndSort(document.getElementById('#list3'),{name:'list3'});
dndSort(document.getElementById('#list4'),{drop:[
    'list1',
    function(enterName){
        if(enterName==='list2') return true;
        else return false;
    }
]})

```

### dropAllow
{Array.<string|function>} 默认为空数组: []

类似`drop`参数，限制 当前列表项 允许接收哪些列表项。默认可以接收任何列表。

```javascript
//限制只有#list1中的列表项能拖动到#list3中
dndSort(document.getElementById('#list1'),{name:'list1'});
dndSort(document.getElementById('#list2'),{name:'list2'});
dndSort(document.getElementById('#list3'),{drop:['list1'])
```

### onDragStart
function( startIndex,srcName,targetEle,sortItemEle )

即将开始拖动时，会触发该事件，如果返回布尔值false，则会取消拖动。

其中，targetEle鼠标当前点击的元素;sortItemEle为当前拖动的li元素项。

```javascript
//当选中checkbox时，允许拖动排序
dndSort(document.getElementById('#list1'),{
    onDragStart:function(){
        document.getElementById('checkbox').checked;
    }
})
```

### onDragOver
function( srcName,tarName,tarEle,sortItemEle )

拖动过程中，会触发该事件。如果返回布尔值false，则禁止拖放到该位置。


### onDragEnd
function( startIndex,endIndex,srcName,tarName )

拖动完成后，触发该事件。startIndex为当前元素项在拖动前的位置，endIndex为拖动后的位置。

### checkDataset
{boolean} 默认为false

是否检查元素属性。
可在li及li以下任意元素，设置下列属性为`"true"`，当`checkDataset`为true时，会检查该属性:

- data-ignore-drag 不允许拖动(类似在onDragStart中判断返回false)
- data-ignore-drop 不允许放置(类似在onDragOver中判断返回false)
- data-ignore-dnd  不允许拖动(等同于`data-ignore-drag`和`data-ignore-drop`均设置为"true")

### dataTransfer
function( startIndex,sortItemEle,srcName )

在拖动开始前，会调用该回调。配合template使用。
startIndex为拖动开始时，当前li元素位置。srtItemEle为当前li元素。

### template
function( data, tarName, srcName )

当跨列表拖动时，当前列表的dom结构可能会和源列表的dom结构不同，通过该回调生成新的dom元素，添加到当前列表中。

其中data参数为`dataTransfer`回调返回值。tarName为当前拖入的列表名称，srcName为源列表名称。

```javascript
dndSort($('#list1')[0], {
        dataTransfer: function (startIndex, sortItemEle, srcName) {
            //用于传给#list2的template
            return {
                name: srcName,
                html: sortItemEle.innerHTML
            }
        },
    });

dndSort($('#list2'), {
        name:'list2',
        template: function (data, srcName, tarName) {
            if (data) {
                return '<div>' +
                    data.html + '<br/> from' + data.name +
                    '</div>';
            }
        }
    });

```

