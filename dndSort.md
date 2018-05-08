##拖动排序插件
目前仅支持加载到ul标签上,实现对li标签的拖动排序。

##state参数
event.sortStart <<Function>>    拖动开始时触发的回调。返回false会取消拖动操作。 function(startIndex,srcName,targetEle,sortItemEle ) 
event.sortOver  <<Function>>    拖动元素和其他元素重合时触发,返回false则禁止拖动元素放置。 function( srcName,tarName,tarEle,sortItemEle)
event.sortEnd   <<Function>>    当拖动结束,且顺序发生变化时触发。function( startIndex,endIndex,srcName,tarName,fixFn);
transData       <<Function>>    需要返回JSON对象。 紧跟在sortStart后触发。    function(startIndex,sortItemEle,srcName)
dataTemplate    <<Function>>    传入transData返回的data, 需要返回html. 当跨列表拖动时,会调用该函数,配合ne-macro使用。 function(data,srcName,tarName)
clsChosen       <<String>>      选中项的样式: 默认dragChosen
clsImage        <<String>>      拖动过程中的样式:默认dragImage
clsHolder       <<String>>      源元素项占位的样式。默认为dragHolder
name            <<String>>      当前列表名称
drop            <<Array>>       限制 当前列表项 可以拖动到哪些列表里。默认可以拖动到任何列表。 格式为: [ name1,function(tarName)/*返回true代表可拖动*/ ... ]
dropAllow       <<Array>>       限制 当前列表项 允许接收哪些列表项。默认可以接收任何列表。 格式为: [ name1,function(srcName)/*返回true代表可拖动*/ ... ]
isHolder        <<Boolean>>     原位置是否显示占位


note:  
使用$$(node).plugin()方法时,传入的扩展对应应为: {state:opt}形式。  


跨列表拖动时,drop和dropAllow,优先判断目标列表的dropAllow,再检查源列表的drop。    


##可添加到li标签的属性
*data-drag-ignore :: 有效值为false或true。 :: 当前li是否允许被拖动。
*data-drop-ignore :: 有效值为false或true。 :: 当前li位置是否允许被放置。
*data-ignore :: 有效值为false或true。 :: drag和drop同时为false或true


note:    
以相关事件返回值为主,如果事件没有返回false,则根据元素属性判断。

