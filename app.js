var options = {
    apis: ["database_api", "network_broadcast_api"],
    url: "wss://node.steem.ws"
};
var Client = window.bundle.Client;
var Api = Client.get(options, true);

Api.initPromise.then(function(res) {
    console.log("Api ready", res);
});

var account;
var accountToAdd = "streemian";
var button_pending = "Waiting for Account name ...";
var button_upgrade = "Upgrade Account";
var button_downgrade = "Downgrade Account";
var posterCount = 1;
var postersDiv =  document.getElementById("posters");
var accountNameInput = document.getElementById("account_name");
var submitButton = document.getElementById("submit_button");
var submitButtonText = document.getElementById("submit_buttonText");
var submitButtonSpinner = document.getElementById("submit_buttonSpinner");
var form = document.getElementById("form");

form.onsubmit = nullFunction;
accountNameInput.onchange = lookUpAccount;

var checkClass = "Streemian__check pull-right success";

function nullFunction(e) {
    e.preventDefault();
}

function setButtonPending() {
    submitButtonText.innerText = button_pending;
    submitButton.className = "btn btn-primary disabled";
    submitButtonSpinner.className = "fa fa-spinner fa-pulse fa-fw"
}

function lookUpAccount() {
    Api.database_api().exec("get_accounts", [ [accountNameInput.value] ]).then(function(res) {
        console.log("account:", res[0]);
        var accountCheck = document.getElementById("account_check");
        account = res[0];
        if (!res[0]) {
            setButtonPending();
            accountCheck.className = checkClass;
            form.onsubmit = nullFunction;
        } else {
            accountCheck.className = checkClass + " visible";
            form.onsubmit = addStreemian;
        }
        checkAuths(res[0]);
    });
}

function checkAuths(account) {
    if (!account) {
        setButtonPending();
        form.onsubmit = nullFunction;
    } else {
        var hasStreemian = false;
        account.posting.account_auths.forEach(function(auth) {
            if (auth[0] === accountToAdd) {
                hasStreemian = true;
            }
        });

        if (hasStreemian) {
            submitButtonText.innerText = button_downgrade;
            submitButton.className = "btn btn-danger";
            submitButtonSpinner.className = ""
            form.onsubmit = removeStreemian;
        } else {
            submitButtonText.innerText = button_upgrade;
            submitButton.className = "btn btn-success";
            submitButtonSpinner.className = ""
            form.onsubmit = addStreemian;
        }
    }
}

function setPasswordIncorrect() {
    document.getElementById("error_warning").innerText = "Password or active private key incorrect, please try again.";
    document.getElementById("error_div").className = "danger";
    document.getElementById("success_message").innerText = "";
}


function setBroadcastError() {
    document.getElementById("error_warning").innerText = "Error Broadcasting transaction!!";
    document.getElementById("error_div").className = "danger";
    document.getElementById("success_message").innerText = "";
}

function removeStreemian(e) {
    e.preventDefault();
    var accountName = document.getElementById("account_name").value;
    var password = document.getElementById("password").value;
    var login = verifyLogin(account, password, null);
    if (!login) {
        setPasswordIncorrect();
        return;
    } else {
        document.getElementById("error_div").className = "";
        document.getElementById("error_warning").innerText = "";
    }
    var postingAuth = account.posting;
    for (var i = 0; i < postingAuth.account_auths.length; i++) {
        if (postingAuth.account_auths[i][0] === accountToAdd) {
            break;
        }
    }
    postingAuth.account_auths.splice(i, 1);
    var tr = new window.bundle.TransactionBuilder();
    tr.add_type_operation("account_update", {
        account: accountName,
        posting: postingAuth,
        memo_key: account.memo_key,
        json_metadata: account.json_metadata
    });
    try {
        tr.process_transaction(login, null, true)
        .then(function(res) {
            document.getElementById("success_message").innerText = "streemian post authorisation has been revoked."
            lookUpAccount();
        }).catch(function(err) {
            setBroadcastError();
            console.log("err:", err);
        })
    }
    catch(err) {
        setBroadcastError();
        console.err(err);
    }
}

function addStreemian(e) {
    e.preventDefault();
    var accountName = document.getElementById("account_name").value;
    var password = document.getElementById("password").value;
    var login = verifyLogin(account, password, null);
    if (!login) {
        setPasswordIncorrect();
        return;
    } else {
        document.getElementById("error_div").className = "";
        document.getElementById("error_warning").innerText = "";
    }
    var postingAuth = account.posting;
    postingAuth.account_auths.push([accountToAdd, postingAuth.weight_threshold]);
    var tr = new window.bundle.TransactionBuilder();
    tr.add_type_operation("account_update", {
        account: accountName,
        posting: postingAuth,
        memo_key: account.memo_key,
        json_metadata: account.json_metadata
    });
    try {
        var result = tr.process_transaction(login, null, true)
        .then(function(res) {
            document.getElementById("success_message").innerText = "streemian successfully given post authorisation"
            lookUpAccount();
        }).catch(function(err) {
            setBroadcastError();
            console.log("err:", err);
        })
    }
    catch(err) {
        setBroadcastError();
        console.err(err);
    }
}

function verifyLogin(account, pass) {
    if (!pass) {
        setPasswordIncorrect();
        return false;
    }
    try {
        var passLogin = new window.bundle.Login();
        passLogin.setRoles(["active"]);
        var passCheck = passLogin.checkKeys({
            accountName: account.name,
            password: pass,
            privateKey: null,
            auths: {
                active: account.active.key_auths
            }}
        );
        if (passCheck) {
            return passLogin;
        }
        var keyLogin = new window.bundle.Login();
        keyLogin.setRoles(["active"]);
        var keyCheck = keyLogin.checkKeys({
            accountName: account.name,
            password: null,
            privateKey: pass,
            auths: {
                active: account.active.key_auths
            }}
        );
        console.log("keyCheck", keyCheck);
        if (keyCheck) {
            return keyLogin;
        }
    } catch(err) {
        console.log("err:", err);
        return false;
    }
    setPasswordIncorrect();
    return false;
}

// renderPosters();
setButtonPending();

