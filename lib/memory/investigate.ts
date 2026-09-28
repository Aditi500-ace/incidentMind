const hits = await hindsight.recall(bankFor(incident.service), {
  query: `${incident.alertText} ${incident.service}`,
  maxTokens: 1500,
});