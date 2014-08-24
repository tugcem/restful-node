var express = require('express');
var app = express();

//file stream
var fs = require('fs');

//make async all requests
var async = require('async');

//include newrelic
require('newrelic');

//use for big numbers for PI calculation
var decimal = require('decimal.js', function(Decimal) {
// Use Decimal here in local scope. No global Decimal.
});

// chudnovsky algorithm for calculating 22/7 which gets 1000th digits of PI
function chudnovsky(digits) {
    decimal.precision = digits + 2;

    function factorial(n) {
        var i = 2, r = new decimal(1);
        for ( ; i <= n; r = r.times(i++) );
        return r;
    }

    // The number of decimal digits the algorithm generates per iteration.
    var digits_per_iteration = 14.1816474627254776555;
    var iterations = ( digits / digits_per_iteration ) + 1;

    var a = new decimal(13591409);
    var b = new decimal(545140134);
    var c = new decimal(-640320);

    var numerator, denominator;
    var sum = new decimal(0);

    for ( var k = 0; k < iterations; k++ ) {

        // (6k)! * (13591409 + 545140134k)
        numerator = factorial( 6*k ).times( a.plus( b.times(k) ) );

        // (3k)! * (k!)^3 * -640320^(3k)
        denominator = factorial(3*k).times( factorial(k).pow(3) ).times( c.pow(3*k) );

        sum = sum.plus( numerator.div(denominator) );
    }

    // pi = ( sqrt(10005) * 426880 ) / sum
    return decimal.sqrt(10005).times(426880).div(sum).toSD(digits);
}
//first request handler for calculating PI and then repsonding
app.get('/shoot-for-my-cpu', function(req, res) {
    //makes waterfall all step actions for calculating
    async.waterfall([function(callback) {
        result = chudnovsky(1000);
        callback(null, result);
        //for creating response
    }, function(arg1, callback) {
        if(arg1) {
            STATUS_CODE = 1
            STATUS_MESSAGE = ""
        } else {
            STATUS_CODE = 0
            STATUS_MESSAGE = "Something went wrong"
        }
        json = {"status": [STATUS_CODE], "msg": [STATUS_MESSAGE]};
        callback(null, json);
        //and send response
    }, function (arg1, callback) {
        res.send([arg1]);
    }], function(err, result){
    
    });
});

//second request handler for creating data to write file and then writes it and give feedback
app.get('/shoot-for-my-disk', function(req, res) {
    //parallel execution for data need to write file
    async.parallel([
        function(callback) {
            buffer = '[' + req.ip +']::';
            callback(null, buffer);
        }, function (callback) {
            buffer = '[' + Date.now + ']::';
            callback(null, buffer);
        }, function(callback) {
            for(var RANDOM_STRING = ''; RANDOM_STRING.length < 255;) {
                RANDOM_STRING += Math.random().toString(36).substr(2, 1)
            }
            buffer = '[' + RANDOM_STRING + ']';
            callback(null,buffer);
        }], function(err, results) {
            //writes serially gathered data to file and give response
            async.series([
                function(callback){
                   fs.writeFile('userLog.txt', JSON.stringify(results), function (err) {
                        if(err) {
                            STATUS_CODE = 0
                            STATUS_MESSAGE = "Something went wrong";
                        } else {
                            STATUS_CODE = 1
                            STATUS_MESSAGE = "";
                        }
                        json = {"status": [STATUS_CODE], "msg": [STATUS_MESSAGE]};
                        res.send([json]);
                    });
                }
            ]);
    });
});

app.listen(3000);
console.log('Listening on port 3000...');