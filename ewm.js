const API_ENDPOINT = 'https://iwebwebhosting.com/v1/membership';
const STRIPE_PUBLIC_KEY = 'pk_test_O4wahG6XsWvI63baMsg1yYPN00TL5IRND7';

var stripeTag = document.createElement('script');
stripeTag.setAttribute('src', 'https://js.stripe.com/v3/');
document.head.appendChild(stripeTag);

var paymentReq = false;

let params = getParams('ewm.js');

if (!getCookie('ewm_userToken')) {
    let elements = document.getElementsByClassName('hid-guests');
    for (var i = 0; i < elements.length; i++) {
        elements[i].parentNode.removeChild(elements[i]);
    }
}


let identity = document.querySelector('[data-id=ewm-identity]');
if (identity) {
    identity.innerText = getCookie('ewm_userIdentity');
}


let stripe_card = document.getElementById('card-element');
if (stripe_card) {
    var stripe = Stripe(STRIPE_PUBLIC_KEY, {
        stripeAccount: "acct_1G1wuEIGebPu1MQ9"
    });
    var elements = stripe.elements();

    // Custom styling can be passed to options when creating an Element.
    // (Note that this demo uses a wider set of styles than the guide below.)
    var style = {
        base: {
            color: '#32325d',
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
                color: '#aab7c4'
            }
        },
        invalid: {
            color: '#fa755a',
            iconColor: '#fa755a'
        }
    };


    var card = elements.create("card", {style: style});


    card.mount("#card-element");
}


//Get membership levels
let levelSelector = document.querySelector('[data-id=ewm-levels]');
if (levelSelector) {
    label = document.createElement("label");
    label.innerHTML = levelSelector.dataset.label;
    levelSelector.appendChild(label);

    fetch(API_ENDPOINT + '/levels', {
        method: 'GET',
        headers: {
            "Content-Type": "application/json",
            'Everweb-License': params.license
        }
    })
        .then(function (response) {
            if (response.ok) {
                return response.json()
            } else {
                throw "Service unavailable";
            }
        })
        .then(function (result) {
            if (result.success) {
                var select = document.createElement("select");
                select.dataset.id = 'ewm-level';

                var option = document.createElement("option");
                option.text = 'Please select';
                option.value = '';
                select.add(option);

                for (var i = 0; i < result.levels.length; i++) {
                    if (result.levels[i].active) {
                        var option = document.createElement("option");
                        var currLevel = result.levels[i];
                        var strPaymentSchedule;


                        switch (currLevel.paymentSchedule) {
                            case 'onetime':
                                strPaymentSchedule = "/one time";
                                // code block
                                break;
                            case 'weekly':
                                // code block
                                strPaymentSchedule = "/weekly";
                                break;
                            case 'monthly':
                                // code block
                                strPaymentSchedule = "/monthly";
                                break;
                            case 'quarterly':
                                strPaymentSchedule = "/quarterly";
                                // code block
                                break;
                            case 'yearly':
                                strPaymentSchedule = "/yearly";
                                // code block
                                break;
                            default:
                                strPaymentSchedule = "";
                            // code block
                        }

                        option.dataset.free = currLevel.paymentSchedule == 'free';
                        console.log(result.levels[i]);


                        if (currLevel.setupPrice == 0 & currLevel.price == 0) {
                            option.text = currLevel.packageName;

                        } else if (currLevel.setupPrice > 0) {
                            option.text = currLevel.packageName + ' - Setup: ' + formatPrice(currLevel.setupPriceFormatted, currLevel.currency) + ' - ' + formatPrice(currLevel.priceFormatted, currLevel.currency) + strPaymentSchedule;//can't use the $ because it might not be dollars

                        } else {

                            option.text = currLevel.packageName + ' - ' + formatPrice(currLevel.priceFormatted, currLevel.currency) + strPaymentSchedule;//can't use the $ because it might not be dollars
                        }

                        option.value = currLevel.code;

                        if (getCookie('ewm_membershipLevel') == option.value) {
                            option.selected = true;
                            //update the info for the Payment field
                            let pckInfo = document.getElementById('ewm-packagename');
                            if (pckInfo) {
                                pckInfo.innerHTML = option.text;
                            }
                            //make sure our payment var is set properly. This could be happen if a paid membership level is stored in a cookie
                            //and we are on the sign up form. This option was defaulting to false
                            if (option.dataset.free == "true") {
                                paymentReq = false;
                                console.log("No payment needed");
                            } else {

                                paymentReq = true;
                                console.log("must pay something");
                            }
                        }

                        select.add(option);
                    }
                }
                levelSelector.appendChild(select);

                select.addEventListener("change", event => {
                    //update the info for the Payment field
                    let pckInfo = document.getElementById('ewm-packagename');
                    if (pckInfo) {
                        pckInfo.innerHTML = event.target.options[event.target.options.selectedIndex].text;
                    }

                    if (event.target.options[event.target.options.selectedIndex].dataset.free == 'true') {
                        paymentReq = false;
                        console.log("Switched to free account");
                    } else {
                        paymentReq = true;
                        console.log("Switched to paid account");
                        //document.querySelector('[data-id=ewm-payment]').style.display = 'block';
                    }
                });
            }
        });
}


let signup_form = document.getElementById('ewm-signup');
if (signup_form) {


    signup_form.addEventListener("submit", event => {
        event.preventDefault();

        //if we are on the info tab, do the sign up. If paymentReq then
        //switch to payment tab, else go to success page
        if (document.getElementById("tab-info").style.display != "none") {
            console.log("Sending user data");
            //we are on the sign up part of the form
            // the trigger signup method will go to the correct location
            //depending on the membership package selected
            trigger_signup();
        } else {
            console.log("Sending payment data");
            //if we are on the payment tab, send the stripe details below
            let payFormSubmit = signup_form.querySelectorAll('[data-id=ewm-successurl]');
            if (payFormSubmit) {

                payFormSubmit.disabled = true;

            }

            let payloader = document.getElementById('payloader');
            payloader.style.display = "block";

            if (paymentReq && card) {

                //get our client secrete
                let inputSecret = document.getElementById('cs_stripe');
                let client_secret = '';
                if (inputSecret) {
                    client_secret = inputSecret.value;
                }

                stripe.confirmCardPayment(client_secret, {
                    payment_method: {
                        card: card,

                    },
                })
                    .then(function (result) {
                        // Handle result.error for result.paymentIntent
                        console.log("Got result for sign up");
                        console.log(result);
                        if (result.paymentIntent.status == "succeeded") {


                            //our payment was successful BUT we may not have received the web hook yet
                            //that verifies that we can actually login
                            // so we actually have to query our database and make sure payment was posted
                            //before we can continue
                            console.log("Payment accepted: " + result.paymentIntent.payment_method);
                            setTimeout(function () {
                                location.href = urlSuccess;
                            }, 1300);
                            //forward them to our success page
                            //location.href = urlSuccess;
                            //we want to save our payment_method back to the server so we can charge this card later
                            //and offline for the sub

                            //once we are here we need to tell the server that everything is ok
                            //set our account to active and then go to our successurl

                        } else {
                            alert("Payment failed: " + result.paymentIntent.status);
                        }
                    });
            }
        }

    });
}


let login_form = document.getElementById('ewm-login');

if (login_form) {
    parseIp();

    login_form.addEventListener("submit", event =>  {
        event.preventDefault();

        let formData = {};
        formData.email = field('ewm-email');
        formData.password = field('ewm-password');
        formData.client_ip = document.getElementById('client_ip').value;

        urlSuccess = field('ewm-successurl');

        fetch(API_ENDPOINT + '/verifyuser', {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: {

                "Content-Type": "application/json",
                'Everweb-License': params.license
            }
        })
            .then(function (response) {
                if (response.ok) {
                    return response.json()
                } else {
                    throw "Service unavailable";
                }
            })
            .then(function (result) {
                if (result.success) {
                    setCookie('ewm_userToken', result.userToken, 7);
                    setCookie('ewm_userIdentity', result.userIdentity, 7);
                    setCookie('ewm_membershipLevel', result.level, 7);
                    console.log(result);
                    location.href = urlSuccess;
                } else {
                    let feedback = document.getElementsByClassName('feedback');
                    if (feedback.length > 0) {
                        feedback = feedback[0];
                        feedback.innerHTML = result.error;
                        feedback.classList.remove('success');
                        feedback.classList.add('error');
                    }
                }
            })
            .catch(function (err) {
                let feedback = document.getElementsByClassName('feedback');
                if (feedback.length > 0) {
                    feedback = feedback[0];
                    feedback.innerHTML = result.error;
                    feedback.classList.remove('success');
                    feedback.classList.add('error');
                }
            });
    });
}


let forgot_form = document.getElementById('ewm-forgotpassword');
if (forgot_form) {
    forgot_form.addEventListener("submit", event => {
        event.preventDefault();

        let formData = {};
        formData.email = field('ewm-email');

        fetch(API_ENDPOINT + '/forgotpassword', {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: {
                "Content-Type": "application/json",
                'Everweb-License': params.license
            }
        })
            .then(function (response) {
                if (response.ok) {
                    return response.json()
                } else {
                    throw "Service unavailable";
                }
            })
            .then(function (result) {
                if (result.success) {
                    let feedback = document.getElementsByClassName('feedback');
                    if (feedback.length > 0) {
                        feedback = feedback[0];
                        feedback.innerHTML = 'We have just sent you an email with instructions to change your password.';
                        feedback.classList.add('success');
                        feedback.classList.remove('error');
                        document.getElementById('ewm-forgotpassword').reset();
                    }
                } else {
                    let feedback = document.getElementsByClassName('feedback');
                    if (feedback.length > 0) {
                        feedback = feedback[0];
                        feedback.innerHTML = result.error;
                        feedback.classList.remove('success');
                        feedback.classList.add('error');
                    }
                }
            })
            .catch(function (err) {
                let feedback = document.getElementsByClassName('feedback');
                if (feedback.length > 0) {
                    feedback = feedback[0];
                    feedback.innerHTML = result.error;
                    feedback.classList.remove('success');
                    feedback.classList.add('error');
                }
            });
    });
}


let changepassword_form = document.getElementById('ewm-changepassword');
if (changepassword_form) {
    changepassword_form.addEventListener("submit", event => {
        event.preventDefault();

        let formData = {};
        formData.password = field('ewm-password');
        formData.password2 = field('ewm-password2');

        urlSuccess = field('ewm-successurl');
        urlError = field('ewm-errorurl');

        if (getCookie('ewm_userToken') != '') {
            url = API_ENDPOINT + '/password/' + getCookie('ewm_userToken');
        } else {
            url = API_ENDPOINT + '/password/' + field('ewm-password-token');
        }

        fetch(url, {
            method: 'PUT',
            body: JSON.stringify(formData),
            headers: {
                "Content-Type": "application/json",
                'Everweb-License': params.license
            }
        })
            .then(function (response) {
                if (response.ok) {
                    return response.json()
                } else {
                    throw "Service unavailable";
                }
            })
            .then(function (result) {
                if (result.success) {
                    location.href = urlSuccess;
                } else {
                    let feedback = document.getElementsByClassName('feedback');
                    if (feedback.length > 0) {
                        feedback = feedback[0];
                        feedback.innerHTML = result.error;
                        if (result.errors) {
                            feedback.innerHTML += '<ul>';
                            for (var i = 0; i < result.errors.length; i++) {
                                feedback.innerHTML += '<li>' + result.errors[i] + '</li>';
                            }
                            feedback.innerHTML += '</ul>';
                        }
                        feedback.classList.remove('success');
                        feedback.classList.add('error');
                    }
                }
            })
            .catch(function (err) {
                let feedback = document.getElementsByClassName('feedback');
                if (feedback.length > 0) {
                    feedback = feedback[0];
                    feedback.innerHTML = err;
                    feedback.classList.remove('success');
                    feedback.classList.add('error');
                }
            });
    });
}


let logoff_link = document.querySelector('[data-id=ewm-logoff]');

if (logoff_link) {
    logoff_link.addEventListener("click", event => {
        event.preventDefault();
        setCookie('ewm_userToken', '', 0);
        setCookie('ewm_userIdentity', '', 0);
        setCookie('ewm_membershipLevel', '', 0);
        window.location.replace('login.php');//go back to the index page
        // location.reload();
    });
}


let profile_form = document.getElementById('ewm-profile');
if (profile_form) {

    urlSuccess = field('ewm-successurl');
    urlError = field('ewm-errorurl');

    fetch(API_ENDPOINT + '/members/' + getCookie('ewm_userToken'), {
        method: 'GET',
        headers: {
            "Content-Type": "application/json",
            'Everweb-License': params.license
        }
    })
        .then(function (response) {
            if (response.ok) {
                return response.json()
            } else {
                throw "Service unavailable";
            }
        })
        .then(function (result) {
            if (result.success) {
                console.log("Member Data: " + result);

                field('ewm-fname', result.member.firstName);
                field('ewm-lname', result.member.lastName);
                field('ewm-email', result.member.email);

                //store the current email in a data attribute to check if is changed
                let emailField = document.getElementById("email");
                emailField.setAttribute("data-email", result.member.email);

                field('ewm-level', result.member.membershipLevel);
                field('ewm-packageName', result.member.level.packageName);
                field('ewm-lastpayment', result.member.lastPaymentOnFormatted);
                field('ewm-nextpayment', result.member.nextPaymentOnFormatted);
                field('ewm-defaultLang', result.member.default_lang)
                document.getElementById('ewm_defaultLang').value = result.member.default_lang;


                let secPaymentInfo = document.getElementById('ewm-paymentInfo');
                secPaymentInfo.style.display = "block";
                let btnRemove = document.getElementById('remove-card');
                if (result.member.paymentData != null && result.member.paymentData.card != '') {

                    elePayInfo = document.getElementById('disPaymentInfo');
                    elePayInfo.innerHTML = result.member.paymentData.card_brand + " ending with " + result.member.paymentData.card_last4;

                    /*field('ewm-paymentInfo-card',result.member.paymentData.card);
                    field('ewm-paymentInfo-card-type',result.member.paymentData.card_type);
                    field('ewm-paymentInfo-card-last4',result.member.paymentData.card_last4);
                    field('ewm-paymentInfo-card-brand',result.member.paymentData.card_brand);*/
                    btnRemove.style.display = "block";
                } else {
                    field('ewm-paymentInfo', "No Payment Data");
                    secPaymentInfo.style.display = "none";

                    let secEnterPaymentInfo = document.getElementById('ewm-addPaymentInfo');
                    secEnterPaymentInfo.style.display = "block";
                }


                field('ewm-status', getStatusLabel(result.member.status));
                console.log(result.member);

                customFields = JSON.parse(result.member.customFields);
                Object.keys(customFields).forEach(function (k) {
                    field('ewm-custom', customFields[k], k);
                });
            } else {
                location.href = urlError;
            }
        })
        .catch(function (err) {
            location.href = urlError;
        });


    //button to add a card


    let btnAddCard = document.getElementById('add-card');
    btnAddCard.addEventListener("click", event => {
        event.preventDefault();
        console.log("add event listener to add");
        console.log("Is payment required? " + paymentReq);
        console.log("Card object: " + card);

        if (card) {//we dont need to check paymentReq because we just want to add our card here
            get_setup_intent();
        }


    });

    //button to remove card
    let btnRemove = document.getElementById('remove-card');
    btnRemove.addEventListener("click", event => {
        event.preventDefault();
        if (confirm("Are you sure you want to remove your payment details?")) {

            let formData = {};
            formData.userToken = getCookie('ewm_userToken');


            fetch(API_ENDPOINT + '/member/removePaymentDetails', {
                method: 'POST',
                body: JSON.stringify(formData),//need to send the user token here
                headers: {
                    "Content-Type": "application/json",
                    'Everweb-License': params.license
                }
            })
                .then(function (response) {
                    if (response.ok) {
                        return response.json()
                    } else {
                        throw "Service unavailable";
                    }
                })
                .then(function (result) {
                    if (result.success) {

                        let secPaymentInfo = document.getElementById('ewm-paymentInfo');
                        secPaymentInfo.style.display = "none";
                        alert('Your payment details have been removed.');
                        location.reload();
                    } else {

                    }
                })
                .catch(function (err) {
                    let feedback = document.getElementsByClassName('feedback');
                    if (feedback.length > 0) {
                        feedback = feedback[0];
                        feedback.innerHTML = err;
                        feedback.classList.remove('success');
                        feedback.classList.add('error');
                    }
                });
        }


    });

    profile_form.addEventListener("submit", event => {
        event.preventDefault();

        //if we change the email, make sure we warn them they will have to re-verify it
        let oldEmail = document.getElementById("email").getAttribute("data-email");

        let formData = {};
        formData.firstName = field('ewm-fname');
        formData.lastName = field('ewm-lname');
        formData.email = field('ewm-email');
        formData.default_lang = document.getElementById("ewm_defaultLang").value;

        if (oldEmail != formData.email) {
            if (!confirm('If you change your email you will have to confirm a the new one. Are you sure you want to change your email?')) {
                console.log("don't confirm email");
                exit;
            }
        }

        formData.membershipLevel = field('ewm-level');//should be on separate form

        urlSuccess = field('ewm-successurl');
        urlError = field('ewm-errorurl');

        let fields = profile_form.querySelectorAll('[data-id=ewm-custom]');
        let customFields = {};
        for (var i = 0; i < fields.length; i++) {
            customFields[fields[i].name] = fields[i].value;
        }

        formData.customFields = customFields;
        console.log(JSON.stringify(formData))

        fetch(API_ENDPOINT + '/members/' + getCookie('ewm_userToken'), {
            method: 'PUT',
            body: JSON.stringify(formData),
            headers: {
                "Content-Type": "application/json",
                'Everweb-License': params.license
            }
        })
            .then(function (response) {
                if (response.ok) {
                    return response.json()
                } else {
                    throw "Service unavailable";
                }
            })
            .then(function (result) {
                if (result.success) {
                    //update our identity cookie -> we should store a few things like name, last login, next payment (maybe)
                    //need to encrypt it.

                    location.href = urlSuccess;
                } else {
                    let feedback = document.getElementsByClassName('feedback');
                    if (feedback.length > 0) {
                        feedback = feedback[0];
                        feedback.innerHTML = result.error;
                        if (result.errors) {
                            feedback.innerHTML += '<ul>';
                            for (var i = 0; i < result.errors.length; i++) {
                                feedback.innerHTML += '<li>' + result.errors[i] + '</li>';
                            }
                            feedback.innerHTML += '</ul>';
                        }
                        feedback.classList.remove('success');
                        feedback.classList.add('error');
                    }
                }
            })
            .catch(function (err) {
                let feedback = document.getElementsByClassName('feedback');
                if (feedback.length > 0) {
                    feedback = feedback[0];
                    feedback.innerHTML = err;
                    feedback.classList.remove('success');
                    feedback.classList.add('error');
                }
            });
    });
}


//TO DO
//once we get the membership info here we
//we start the payment intent. When we have that
//we can enable the form for payment
let payment_form = document.getElementById('ewm-pay');
if (payment_form) {
    parseIp();
    
    console.log("Get member info");
    fetch(API_ENDPOINT + '/membersMemInfo/' + getCookie('ewm_userToken'), {
        method: 'GET',
        headers: {
            "Content-Type": "application/json",
            'Everweb-License': params.license
        }
    })
        .then(function (response) {
            if (response.ok) {
                return response.json()
            } else {
                throw "Service unavailable";
            }
        })
        .then(function (result) {
            if (result.success) {


                if (!result.member.allowPayment) {
                    location.href = 'success.php';
                    return;
                }


                //successfully got the payment data
                //we should start a payment intent here
                console.log("Member Code: " + result.member.code);

                // Register intent payment
                get_payment_intent(result.member.code);

                //get_setup_intent();
                //should show a waiting indicator here
                console.log("member info result: ".result);
                let pckInfo = document.getElementById('ewm-packagename');
                if (pckInfo) {
                    pckInfo.innerHTML = result.member.packageName + ' - ' + result.member.formattedPrice + "/" + result.member.paymentSchedule;
                }

                let pckLevelInfo = document.getElementById('ewm-level')
                if (pckLevelInfo) {
                    pckLevelInfo.value = result.member.code;
                }

            } else {
                console.log("error with getting payment data");
                // alert("error with getting payment data");
            }

        })
        .catch(function (err) {
            console.log("error with getting payment data");
        });


    payment_form.addEventListener("submit", event => {
        event.preventDefault();


        if (card) {//if this is showing up then we need payment. No need to check that paymentReq variable
            //actually here we could just call trigger pay with our client secret
            //and have our server process: https://stripe.com/docs/api/payment_intents/capture

            //get our client secret
            let inputSecret = document.getElementById('cs_stripe');
            let client_secret = '';
            if (inputSecret) {
                client_secret = inputSecret.value;
            }

            alert("Client secrete: " + client_secret);

            //this code works for payment intents
            stripe.confirmCardPayment(client_secret, {
                payment_method: {
                    card: card,

                },
            })
                .then(function (result) {
                    // Handle result.error or result.paymentIntent
                    console.log("Got result for payment form");
                    console.log(result.paymentIntent);


                    if (result.paymentIntent.status == "succeeded") {
                        //alert("Payment was accepted: " + result.paymentIntent.payment_method);
                        //we want to save our payment_method back to the server so we can charge this card later
                        //and offline for the sub

                        //once we are here we need to tell the server that everything is ok
                        //set our account to active and then go to our successurl

                        location.href = urlSuccess;
                    } else {
                        //alert("Payment failed: " +  result.paymentIntent.status);
                        console.log(result);
                        let feedback = document.getElementsByClassName('feedback');
                        if (feedback.length > 0) {
                            feedback = feedback[0];
                            feedback.innerHTML = result.error.message;
                            feedback.classList.remove('success');
                            feedback.classList.add('error');
                        }
                    }
                });


        } else {
            trigger_pay('');
        }
    });
}


let cancel_form = document.getElementById('ewm-cancel');
if (cancel_form) {
    urlSuccess = field('ewm-successurl');

    let formData = {
        userToken: getCookie('ewm_userToken')
    };

    cancel_form.addEventListener("submit", event => {
        event.preventDefault();

        fetch(API_ENDPOINT + '/cancelmember', {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: {
                "Content-Type": "application/json",
                'Everweb-License': params.license
            }
        })
            .then(function (response) {
                if (response.ok) {
                    return response.json()
                } else {
                    throw "Service unavailable";
                }
            })
            .then(function (result) {
                if (result.success) {
                    setCookie('ewm_userToken', '', 0);
                    setCookie('ewm_userIdentity', '', 0);
                    setCookie('ewm_membershipLevel', '', 0);

                    location.href = urlSuccess;
                }
            })
            .catch(function (err) {
                let feedback = document.getElementsByClassName('feedback');
                if (feedback.length > 0) {
                    feedback = feedback[0];
                    feedback.innerHTML = err;
                    feedback.classList.remove('success');
                    feedback.classList.add('error');
                }
            });

    });
}

function get_setup_intent() {
    parseIp();

    let feedback = document.getElementsByClassName('feedback');
    if (feedback.length > 0) {
        feedback = feedback[0];
        feedback.classList.remove('success');
        feedback.classList.remove('error');
    }

    let formData = {};
    formData.client_ip = document.getElementById('client_ip').value;

    urlSuccess = field('ewm-successurl');
    urlError = field('ewm-errorurl');
    fetch(API_ENDPOINT + '/setupIntent/' + getCookie('ewm_userToken'), {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {
            "Content-Type": "application/json",
            'Everweb-License': params.license
        }
    })
        .then(function (response) {
            if (response.ok) {
                return response.json()
            } else {
                throw "Service unavailable";
            }
        })
        .then(function (result) {
            if (result.success) {
                //alert("We got the payment intent, we can now show the order form: " + result.client_secret);
                console.log("Client Secret: " + result.client_secret);


                stripe.confirmCardSetup(
                    result.client_secret,
                    {
                        payment_method: {
                            card: card,

                        },
                    }
                ).then(function (result) {
                    if (result.error) {
                        // Display error.message in your UI.
                        console.log(result);
                        alert("There was an error saving your payment details.");
                        console.log("error on setup intent");
                        let feedback = document.getElementsByClassName('feedback');
                        if (feedback.length > 0) {
                            feedback = feedback[0];
                            feedback.innerHTML = result.error.message;
                            if (result.errors) {
                                feedback.innerHTML += '<ul>';
                                for (var i = 0; i < result.errors.length; i++) {
                                    feedback.innerHTML += '<li>' + result.errors[i] + '</li>';
                                }
                                feedback.innerHTML += '</ul>';
                            }
                            feedback.classList.remove('success');
                            feedback.classList.add('error');
                        }

                    } else {
                        // The setup has succeeded. Display a success message.
                        alert("Your payment details have been saved");
                        location.reload();
                    }
                });

            } else {
                console.log("error on setup intent");
                let feedback = document.getElementsByClassName('feedback');
                if (feedback.length > 0) {
                    feedback = feedback[0];
                    feedback.innerHTML = result.error;
                    if (result.errors) {
                        feedback.innerHTML += '<ul>';
                        for (var i = 0; i < result.errors.length; i++) {
                            feedback.innerHTML += '<li>' + result.errors[i] + '</li>';
                        }
                        feedback.innerHTML += '</ul>';
                    }
                    feedback.classList.remove('success');
                    feedback.classList.add('error');
                }
            }
        })
        .catch(function (err) {
            console.log("Exception on payment intent");
            let feedback = document.getElementsByClassName('feedback');
            if (feedback.length > 0) {
                feedback = feedback[0];
                feedback.innerHTML = err;
                feedback.classList.remove('success');
                feedback.classList.add('error');
            }
        });
}

function get_payment_intent(level) {
    let formData = {};
    //formData.userToken = getCookie('ewm_userToken');
    formData.membershipLevel = level;
    formData.client_ip = document.getElementById('client_ip').value;

    urlSuccess = field('ewm-successurl');
    urlError = field('ewm-errorurl');
    fetch(API_ENDPOINT + '/paymentIntent/' + getCookie('ewm_userToken'), {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {
            "Content-Type": "application/json",
            'Everweb-License': params.license
        }
    })
        .then(function (response) {
            if (response.ok) {
                return response.json()
            } else {
                throw "Service unavailable";
            }
        })
        .then(function (result) {
            console.log(result)
            if (result.success) {

                //get our payment form and show it. Then insert the client secret from stripe
                let pmtInfo = document.getElementById('ewm-pay');
                if (pmtInfo) {
                    pmtInfo.style.display = "block";
                    //set a hidden form field with our paument intent
                    var inputSecret = document.createElement("input");

                    inputSecret.setAttribute("type", "hidden");

                    inputSecret.setAttribute("name", "cs_stripe");
                    inputSecret.setAttribute("id", "cs_stripe");

                    inputSecret.setAttribute("value", result.client_secret);

                    //append to form element that you want .
                    pmtInfo.appendChild(inputSecret);
                } else {
                    alert("Error can't find payment form");
                }
                //alert("We got the payment intent, we can now show the order form: " + result.client_secret);
                console.log(result.client_secret);

            } else {
                console.log("error on payment intent");
                let feedback = document.getElementsByClassName('feedback');
                if (feedback.length > 0) {
                    feedback = feedback[0];
                    feedback.innerHTML = result.error;
                    if (result.errors) {
                        feedback.innerHTML += '<ul>';
                        for (var i = 0; i < result.errors.length; i++) {
                            feedback.innerHTML += '<li>' + result.errors[i] + '</li>';
                        }
                        feedback.innerHTML += '</ul>';
                    }
                    feedback.classList.remove('success');
                    feedback.classList.add('error');
                }
            }
        })
        .catch(function (err) {
            console.log("Exception on payment intent");
            let feedback = document.getElementsByClassName('feedback');
            if (feedback.length > 0) {
                feedback = feedback[0];
                feedback.innerHTML = err;
                feedback.classList.remove('success');
                feedback.classList.add('error');
            }
        });
}

function trigger_pay(payment_token) {
    let formData = {};
    formData.userToken = getCookie('ewm_userToken');
    formData.membershipLevel = field('ewm-level');
    formData.payment_token = payment_token;

    urlSuccess = field('ewm-successurl');
    urlError = field('ewm-errorurl');

    fetch(API_ENDPOINT + '/updatepayment', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {
            "Content-Type": "application/json",
            'Everweb-License': params.license
        }
    })
        .then(function (response) {
            if (response.ok) {
                return response.json()
            } else {
                throw "Service unavailable";
            }
        })
        .then(function (result) {
            if (result.success) {
                location.href = urlSuccess;
            } else {
                let feedback = document.getElementsByClassName('feedback');
                if (feedback.length > 0) {
                    feedback = feedback[0];
                    feedback.innerHTML = result.error;
                    if (result.errors) {
                        feedback.innerHTML += '<ul>';
                        for (var i = 0; i < result.errors.length; i++) {
                            feedback.innerHTML += '<li>' + result.errors[i] + '</li>';
                        }
                        feedback.innerHTML += '</ul>';
                    }
                    feedback.classList.remove('success');
                    feedback.classList.add('error');
                }
            }
        })
        .catch(function (err) {
            let feedback = document.getElementsByClassName('feedback');
            if (feedback.length > 0) {
                feedback = feedback[0];
                feedback.innerHTML = err;
                feedback.classList.remove('success');
                feedback.classList.add('error');
            }
        });
}


function field(name, value = '', fieldname = '') {
    let obj = document.querySelectorAll('[data-id=' + name + ']');
    if (obj.length > 0) {
        if (value != '') {
            if (fieldname == '') {
                obj[0].value = value;
                return obj[0].value;
            } else {
                for (var i = 0; i < obj.length; i++) {
                    if (obj[i].name == fieldname) {
                        obj[i].value = value;
                        return obj[i].value;
                    }
                }
            }
        } else {
            return obj[0].value;
        }
    } else {
        return "";
    }
}


function getParams(script_name) {
    // Find all script tags

    var scripts = document.getElementsByTagName("script");

    // Look through them trying to find ourselves

    for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src.indexOf("/" + script_name) > -1) {
            // Get an array of key=value strings of params

            var pa = scripts[i].src.split("?").pop().split("&");

            // Split each key=value into array, the construct js object

            var p = {};
            for (var j = 0; j < pa.length; j++) {
                var kv = pa[j].split("=");
                p[kv[0]] = kv[1];
            }
            return p;
        }
    }

    // No scripts match

    return {};
}


function trigger_signup() {
    let formData = {};
    console.log("trigger_signup");
    formData.firstName = field('ewm-fname');
    formData.lastName = field('ewm-lname');
    formData.email = field('ewm-email');
    formData.password = field('ewm-password');
    formData.password2 = field('ewm-password2');
    formData.membershipLevel = field('ewm-level');
    formData.address = field('ewm-address');
    formData.address2 = field('ewm-address2');
    formData.city = field('ewm-city');
    formData.state = field('ewm-state');
    formData.country = field('ewm-country');
    formData.postalCode = field('ewm-postalCode');
    //formData.payment_token = payment_token;
    formData.source = "form";//so we know to send a message to the site owner

    urlSuccess = field('ewm-successurl');
    urlError = field('ewm-errorurl');

    let fields = signup_form.querySelectorAll('[data-id=ewm-custom]');
    let customFields = {};
    for (var i = 0; i < fields.length; i++) {
        customFields[fields[i].name] = fields[i].value;
    }
    formData.customFields = customFields;

    fetch(API_ENDPOINT + '/members', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {
            "Content-Type": "application/json",
            'Everweb-License': params.license
        }
    })
        .then(function (response) {
            if (response.ok) {
                return response.json()
            } else {
                throw "Service unavailable";
            }
        })
        .then(function (result) {
            if (result.success) {
                //on sign up success, we should should show the next tab
                console.log("trigger_signup : success");
                setCookie('ewm_userToken', result.userToken, 7);
                setCookie('ewm_userIdentity', result.userIdentity, 7);
                setCookie('ewm_membershipLevel', result.level, 7);

                let feedback = document.getElementsByClassName('feedback');
                feedback[0].style.display = 'none';
                feedback[0].innerHTML = '';
                //console.log(feedback);
                if (paymentReq) {
                    //payment required
                    //let stripe_cs = result.stripe_cs;


                    goPayTab(result.stripe_cs);
                } else {
                    //free account, go right to success page
                    //console.log("go to success url: " + urlSuccess);
                    location.href = urlSuccess;
                }
            } else {
                let feedback = document.getElementsByClassName('feedback');
                console.log("feedback : " + result);
                if (feedback.length > 0) {
                    feedback = feedback[0];
                    feedback.innerHTML = result.error;
                    if (result.errors) {
                        feedback.innerHTML += '<ul>';
                        for (var i = 0; i < result.errors.length; i++) {
                            feedback.innerHTML += '<li>' + result.errors[i] + '</li>';
                        }
                        feedback.innerHTML += '</ul>';
                    }
                    feedback.classList.remove('success');
                    feedback.classList.add('error');
                }
            }
        })
        .catch(function (err) {
            let feedback = document.getElementsByClassName('feedback');
            if (feedback.length > 0) {
                feedback = feedback[0];
                feedback.innerHTML = err;
                feedback.classList.remove('success');
                feedback.classList.add('error');
            }
        });
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

(window.location.search.substr(1).split('&'));

function goPayTab(stripe_cs) {
    let feedback = document.getElementsByClassName('feedback');
    if (feedback.length > 0) {
        feedback.innerHTML = '';
    }

    let tabInfo = document.getElementById("tab-info");
    let tabPayment = document.getElementById("tab-payment");

    tabInfo.style.display = "none";
    tabPayment.style.display = "inline";
    //add our client secret as a hidden input field
    //get our payment form and show it. Then insert the client secret from stripe
    let pmtInfo = document.getElementById('ewm-payment');
    if (pmtInfo) {
        pmtInfo.style.display = "block";
        //set a hidden form field with our paument intent
        var inputSecret = document.createElement("input");

        inputSecret.setAttribute("type", "hidden");

        inputSecret.setAttribute("name", "cs_stripe");
        inputSecret.setAttribute("id", "cs_stripe");

        inputSecret.setAttribute("value", stripe_cs);

        //append to form element that you want .
        pmtInfo.appendChild(inputSecret);


    } else {
        alert("Error can't find payment form");
    }


}

function getStatusLabel(status) {
    switch (status) {
        case 0:
            return 'Pending';
            break;
        case 1:
            return 'Active';
            break;
        case 2:
            return 'Suspended';
            break;
        case 3:
            return 'Cancelled';
            break;
    }


}


function formatPrice(price, currency) {
    return price;
    currency = currency.toLowerCase();
    switch (currency) {
        case 'cad':
        case 'aud':
        case 'nzd':
        case 'usd':
            return "$" + price + ' ' + currency.toUpperCase();
            break;
        case "gbp":
            return price + '€';
            // code block
            break;
        case 'eur':
            return price + '£';
        default:
            // code block
            return price;
    }

}


var c = document.createComment("EWM");
document.body.appendChild(c);

function parseIp()
{
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://www.cloudflare.com/cdn-cgi/trace');
    xhr.send();


    xhr.onload = function() {
        const data = xhr.response;
        const ipRegex = /ip=[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}/;
        const ip = data.match(ipRegex)[0].replace("ip=", "");

        document.getElementById('client_ip').value = ip;
    }

}