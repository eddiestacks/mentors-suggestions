module.exports = {
    pseudoPhrase: function(input) {

        // Lowercase the given input 
        var lcaseInput = input.toLowerCase();
        // Remove some non-alphabetical characters (numbers and punctuation)
        // Strip the lowercase string of numbers and periods followed by a space
        var noNumberSTR = lcaseInput.split(/\d*\.\d+|\d+|(\. )/g).join(" ");
        // Strip punctuation. (second replace handles periods and accounts for acronmyms)
        var noPunctuationInput = noNumberStr.replace(/[\,\?\!\*\:\&\'\$]/ig, " ").replace(/\./ig, "");

        // Tokenize on whitespace and return an array of non-empty strings
        var tokenizedInput = _.filter(noPunctuationInput.split(/\s/), function(token) {
            return token.length > 0
        });

        //todo: Implement porter2 stemming algorithm @sprint2

    }
};
