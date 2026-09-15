/* Original practice vocabulary and code fragments. No code is executed. */
window.TypingData = Object.freeze({
  version: 1,
  durations: [15, 30, 60, 90, 120, 300, 600, 1800, 3600],
  languages: {
    english: {label: "English", lang: "en-GB", words: "the be to of and a in that have I it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us find here thing tell through long very where much before right too mean old same great small place world still hand high keep help turn every start might show part home again around water light write word learn open next country green morning river life sound move read under story together clear between each change".split(" ")},
    irish: {label: "Gaeilge", lang: "ga", words: "an na agus ar ag le is tá bhí mé tú sé sí sinn sibh siad mo do a ár bhur seo sin anseo ansin ann inniu inné amárach anois arís riamh fós maith mór beag fada gearr bán dubh dearg glas gorm buí nua sean álainn ciúin fuar te lá oíche maidin tráthnóna am bliain mí seachtain uair nóiméad duine daoine fear bean páiste cara clann teach baile scoil obair leabhar focal scéal ceol amhrán teanga Gaeilge Béarla Éire tír domhan bóthar sráid doras fuinneog bord cathaoir bia uisce bainne arán tae caife úll madra cat capall éan iasc crann bláth féar grian gealach spéir báisteach gaoth sneachta farraige abhainn sliabh loch trá oileán ceann lámh cos súil croí ainm áit rud rud éigin gach aon eile eileach isteach amach suas síos abhaile anseo leis léi linn libh leo orm ort air uirthi againn agat acu orm faoi thar idir roimh tar éis gan go dtí mar ach nó más nuair cén cad conas cá cén fáth fáil dul teacht déanamh feiceáil rá bheith eolas fáilte slán buíochas sonas cairdeas misneach".split(" ")},
    python: {label: "Python", lang: "en", snippets: [
      "def greet(name): return f\"Hello, {name}!\"",
      "numbers = [value * 2 for value in range(10)]",
      "total = sum(price for price in prices if price > 0)",
      "with open(\"notes.txt\") as file: text = file.read()",
      "if count > 0: print(\"Items:\", count)",
      "for index, item in enumerate(items): print(index, item)",
      "result = sorted(set(values), reverse=True)",
      "user = {\"name\": \"Alex\", \"active\": True}",
      "def square(value): return value ** 2",
      "names = [name.strip().lower() for name in entries]",
      "assert len(queue) == 0, \"Queue must be empty\"",
      "from pathlib import Path",
      "message = \" \".join(words)",
      "while tasks: completed.append(tasks.pop())",
      "average = sum(scores) / len(scores) if scores else 0",
      "pairs = list(zip(keys, values))",
      "if __name__ == \"__main__\": main()",
      "def clamp(value, low, high): return max(low, min(value, high))"
    ]},
    java: {label: "Java", lang: "en", snippets: [
      "public static int square(int value) { return value * value; }",
      "String message = \"Hello, world!\";",
      "for (int i = 0; i < values.length; i++) { total += values[i]; }",
      "List<String> names = new ArrayList<>();",
      "if (count > 0) { System.out.println(count); }",
      "Map<String, Integer> scores = new HashMap<>();",
      "boolean ready = items != null && !items.isEmpty();",
      "public static void main(String[] args) { run(); }",
      "for (String name : names) { System.out.println(name); }",
      "return Optional.ofNullable(result);",
      "int[] numbers = {1, 2, 3, 4, 5};",
      "String label = input.trim().toLowerCase();",
      "while (!queue.isEmpty()) { process(queue.poll()); }",
      "Objects.requireNonNull(value, \"Value is required\");",
      "double average = total / (double) count;",
      "public record Point(int x, int y) {}",
      "if (left.equals(right)) { return true; }",
      "final int MAX_RETRIES = 3;"
    ]}
  }
});
