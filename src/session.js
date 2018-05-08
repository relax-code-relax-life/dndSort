var state = {};

var session = {};

session.clear = function (prop) {
    if (!prop) state = {};
    else state[prop] = undefined;
};

session.set = function (obj) {

    state.hasData = true;

    Object.assign(state, obj);

};

session.get = function (prop) {
    return state[prop];
};

session.hasData = function () {
    return state.hasData;
};

var cnt = 0;
session.getGuid = function () {
    return '__dragSort' + cnt++ + '_';
}


export default session;