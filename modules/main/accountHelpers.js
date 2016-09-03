(function ()
{
    var util = require('../util.js');

    module.exports = {
        isLoadedAndUnlocked: function(cb)
        {
            if (global.accountsData.isLoaded)
            {
                if (global.accountsData.dataLocked)
                {
                    cb(false, 'Accounts Data Record Locked');
                }
                else
                {
                    cb(true);
                }

            }
            else
            {
                cb(false, 'Accounts Data Not Loaded');
            }

        },
        hasAuth: function(authJSON)
        {
            var info = {
                has: false,
                data: {}
            };

            try {
                var data = JSON.parse(authJSON);

                if (data.password)
                {
                    info.has = true;
                    info.data = data;
                }

            } catch (err)
            {
                console.log(err);
            }

            return info;
        },
        updateStoredAccounts: function(storedData, oldPassphrase, newPassphrase, cb)
        {
            var emptyOBJ = JSON.stringify({});
            var mode = 'change'; //change stored credentials passphrase

            //if oldPassphrase is undefined, not encrypted yet
            //if oldPassphrase and newPassphrase both are undefined - remove stored credentials
            //if oldPassphrase and newPassphrase both are defined - change stored credentials passphrase
            //if oldPassphrase and newPassphrase both are defined, but new one is a empty string - then unencrypt but keep credentials

            if (oldPassphrase === undefined && newPassphrase === undefined)
            {
                mode = 'remove'; //remove stored credentials
            }
            else if (oldPassphrase === undefined)
            {
                mode = 'encrypt'; //encrypt credentials
            }

            //loop accounts
            for (var acc in storedData.accounts)
            {
                if (storedData.accounts.hasOwnProperty(acc))
                {

                    //update record
                    if (mode == 'encrypt')
                    {
                        if (storedData.accounts[acc].encrypted) return cb(new Error('Encrypted Already'));

                        storedData.accounts[acc].hasAuth = module.exports.hasAuth(storedData.accounts[acc].auth).has;
                        storedData.accounts[acc].auth = util.encrypt(storedData.accounts[acc].auth, newPassphrase);
                        storedData.accounts[acc].encrypted = true;
                    }
                    else if (mode == 'change')
                    {
                        if (storedData.accounts[acc].encrypted)
                        {
                            var decryptedString = util.decrypt(storedData.accounts[acc].auth, oldPassphrase);
                            storedData.accounts[acc].hasAuth = module.exports.hasAuth(decryptedString).has;

                            if (newPassphrase.length > 0)
                            {
                                storedData.accounts[acc].auth = util.encrypt(decryptedString, newPassphrase);
                                storedData.accounts[acc].encrypted = true;
                            }
                            else
                            {
                                storedData.accounts[acc].auth = decryptedString;
                                storedData.accounts[acc].encrypted = false;
                            }

                        }
                        else
                        {
                            return cb(new Error('Not Encrypted'));
                        }

                    }
                    else if (mode == 'remove')
                    {
                        storedData.accounts[acc].hasAuth = false;
                        storedData.accounts[acc].auth = emptyOBJ;
                        storedData.accounts[acc].encrypted = false;
                    }
                    else
                    {
                        return cb(new Error('Invalid Mode'));
                    }

                }

            }

            cb();
        }

    };

}());