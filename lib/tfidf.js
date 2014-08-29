module.exports = {
  calcTF: function(termFrequencyHash, currentTerm, index, array) {
    if (!(currentTerm in termFrequencyHash)) {
      termFrequencyHash[currentTerm] = {};
      termFrequencyHash[currentTerm]["Term Frequency"] = 1;
      // termFrequencyHash[currentTerm]["Term Frequency"] = 1 / array.length;
    } else {
      termFrequencyHash[currentTerm]["Term Frequency"] += 1;
      // termFrequencyHash[currentTerm]["Term Frequency"] += 1 / array.length;
    }
    return termFrequencyHash;
  },
  tf: function(words) {
    return words.reduce(this.calcTF, {});
  },
  tfidf: function(results, context) {
    // Generate promises for all keywords and store them in dfPromises
    var that = this;
    var dfPromises = [];
    _.each(results, function(result, term, results) {
      dfPromises.push(
        context.ajax("requestDF", term).done(function(data) {
          // on completion store received data in the result object for the term
          results[term]["Document Frequency"] = data.count;
          results[term]["Inverted Document Frequency"] = that.idf(data.count);
          results[term]["TF*IDF"] = results[term]["Term Frequency"] * results[term]["Inverted Document Frequency"];
        }));
    });
    // Return a master promise that resolves when all dfPromises resolve
    return context.when.apply(context, dfPromises); 
  },

  // documentFrequency is the number of articles the term is found in
  idf: function(documentFrequency) {
    // totalArticleCount is the number of unique documents in KB
    // todo: Remove hardcoded articleCount and pull on app load (3)
    // Hardcoded based on api results: 17,018 as of 8/26/2014
    var totalArticleCount = 17018;
    return Math.log(totalArticleCount / documentFrequency) / Math.log(10);
    // return Math.log(totalArticleCount / (1 + documentFrequency)) / Math.log(10);
  },
  analyze: function(words, context) {
    var results = this.tf(words);
    // tfidf must be fetched by using the this.tfidf.then in order to wait for all the promises to resolve
    var promises = this.tfidf(results, context)
      .then(function() {
        console.log(results);
      });

  }
};
