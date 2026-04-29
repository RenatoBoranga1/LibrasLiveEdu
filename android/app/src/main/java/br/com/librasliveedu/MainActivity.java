package br.com.librasliveedu;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.ArrayAdapter;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public class MainActivity extends Activity {
    private static final int INK = 0xFF10201C;
    private static final int PAPER = 0xFFF8FAF7;
    private static final int OCEAN = 0xFF0F766E;
    private static final int MINT = 0xFFD9F99D;
    private static final int AMBER = 0xFFF59E0B;
    private static final int WHITE = 0xFFFFFFFF;
    private static final int SOFT = 0xFFEFF7F4;

    private static final String ACCESSIBILITY_NOTICE =
            "Esta ferramenta é um recurso de apoio à acessibilidade e à inclusão educacional. " +
            "Ela não substitui intérpretes humanos de Libras em situações formais, mas oferece " +
            "suporte complementar por meio de legenda em tempo real, avatar em Libras e recursos visuais.";

    private final List<String> transcript = new ArrayList<>();
    private final Set<String> savedWords = new LinkedHashSet<>();
    private final List<SignItem> signs = new ArrayList<>();
    private final List<String> demoLines = Arrays.asList(
            "Bom dia, turma. Hoje vamos estudar tecnologia, dados e informação.",
            "Um sistema usa entrada, processamento e saída para resolver problemas.",
            "Na matemática, a soma e a divisão ajudam a comparar números.",
            "Em ciências, energia, água, planta e animal são palavras importantes.",
            "No final da aula faremos uma atividade em grupo e revisaremos as palavras-chave."
    );
    private final String[] subjects = {
            "Português", "Matemática", "Ciências", "Biologia", "Química", "Física",
            "História", "Geografia", "Informática", "Inglês", "Projeto de Vida",
            "Administração", "Tecnologia"
    };

    private boolean highContrast = false;
    private boolean largeCaption = true;
    private int demoIndex = 0;
    private String classCode = "DEMO01";
    private String currentCaption = "Aguardando transmissão...";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        seedLocalDictionary();
        renderHome();
    }

    private void seedLocalDictionary() {
        if (!signs.isEmpty()) {
            return;
        }
        String[] words = {
                "professor", "aluno", "escola", "aula", "tecnologia", "dados",
                "informação", "sistema", "número", "soma", "divisão", "energia",
                "água", "planta", "animal", "história", "geografia", "texto",
                "palavra", "leitura", "interpretação", "computador", "internet", "atividade"
        };
        for (String word : words) {
            signs.add(new SignItem(
                    word,
                    "pending",
                    "Seed educacional inicial",
                    "Aguardando curadoria",
                    "Registro inicial para curadoria por especialista em Libras"
            ));
        }
    }

    private void renderHome() {
        LinearLayout page = basePage("LibrasLive Edu", "Acessibilidade educacional em tempo real");
        page.addView(modeBadge("modo demonstração offline"));
        page.addView(paragraph("Plataforma educacional inclusiva para apoiar alunos surdos com legenda ao vivo, avatar em Libras, cards visuais, histórico da aula, resumo automático e glossário visual por disciplina.", 17, false));

        LinearLayout actions = vertical(12);
        actions.addView(primaryButton("Sou Professor", v -> renderProfessor()));
        actions.addView(primaryButton("Sou Aluno", v -> renderStudentJoin()));
        actions.addView(secondaryButton("Administrador", v -> renderAdmin()));
        page.addView(card(actions));

        page.addView(noticeCard());
        show(page);
    }

    private void renderProfessor() {
        LinearLayout page = basePage("Painel do professor", "Crie uma aula e transmita em modo demo");
        EditText title = input("Título da aula", "Aula demo: tecnologia, dados e informação");
        Spinner subjectSpinner = new Spinner(this);
        subjectSpinner.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, subjects));

        LinearLayout form = vertical(12);
        form.addView(label("Título da aula"));
        form.addView(title);
        form.addView(label("Disciplina"));
        form.addView(subjectSpinner);
        form.addView(primaryButton("Iniciar transmissão", v -> {
            ensureMicrophonePermission();
            currentCaption = nextDemoLine();
            Toast.makeText(this, "Microfone demo ativo. Código: " + classCode, Toast.LENGTH_SHORT).show();
            renderProfessorLive(title.getText().toString(), subjectSpinner.getSelectedItem().toString());
        }));
        page.addView(card(form));
        page.addView(outlineButton("Voltar", v -> renderHome()));
        show(page);
    }

    private void renderProfessorLive(String title, String subject) {
        LinearLayout page = basePage("Transmissão ativa", subject);
        page.addView(modeBadge("microfone ativo em modo demo"));

        LinearLayout room = horizontal(12);
        room.addView(bigMetric("Código", classCode));
        room.addView(bigMetric("Status", "ativo"));
        page.addView(room);

        page.addView(sectionTitle(title));
        page.addView(captionBox(currentCaption, 25));

        LinearLayout actions = vertical(8);
        actions.addView(primaryButton("Próximo trecho", v -> {
            currentCaption = nextDemoLine();
            renderProfessorLive(title, subject);
        }));
        actions.addView(outlineButton("Pausar", v -> Toast.makeText(this, "Aula pausada", Toast.LENGTH_SHORT).show()));
        actions.addView(dangerButton("Finalizar", v -> renderReview()));
        page.addView(actions);

        page.addView(sectionTitle("Transcrição"));
        for (String line : transcript) {
            page.addView(transcriptItem(line));
        }
        page.addView(outlineButton("Exportar PDF", v -> Toast.makeText(this, "Exportação PDF fica disponível pelo backend FastAPI.", Toast.LENGTH_LONG).show()));
        show(page);
    }

    private void renderStudentJoin() {
        LinearLayout page = basePage("Entrar na aula", "Use o código exibido pelo professor");
        EditText codeInput = input("Código da aula", classCode);
        LinearLayout form = vertical(12);
        form.addView(label("Código da aula"));
        form.addView(codeInput);
        form.addView(primaryButton("Entrar", v -> {
            classCode = codeInput.getText().toString().trim().toUpperCase();
            if (classCode.isEmpty()) {
                classCode = "DEMO01";
            }
            renderStudentLive();
        }));
        page.addView(card(form));
        page.addView(noticeCard());
        page.addView(outlineButton("Voltar", v -> renderHome()));
        show(page);
    }

    private void renderStudentLive() {
        LinearLayout page = basePage("Sala " + classCode, "Tela do aluno");
        page.addView(modeBadge("legenda ativa"));
        page.addView(avatarPanel());
        page.addView(captionBox(currentCaption, largeCaption ? 31 : 23));

        LinearLayout controls = vertical(8);
        controls.addView(primaryButton("Simular trecho", v -> {
            currentCaption = nextDemoLine();
            renderStudentLive();
        }));
        controls.addView(outlineButton("Aumentar texto", v -> {
            largeCaption = !largeCaption;
            renderStudentLive();
        }));
        controls.addView(outlineButton("Alto contraste", v -> {
            highContrast = !highContrast;
            renderStudentLive();
        }));
        page.addView(controls);

        page.addView(sectionTitle("Cards visuais"));
        page.addView(signCards(extractCurrentCards()));

        page.addView(sectionTitle("Histórico dos últimos trechos"));
        for (String line : transcript) {
            page.addView(transcriptItem(line));
        }

        LinearLayout bottom = vertical(8);
        bottom.addView(secondaryButton("Revisar aula", v -> renderReview()));
        bottom.addView(outlineButton("Voltar", v -> renderHome()));
        page.addView(bottom);
        show(page);
    }

    private void renderReview() {
        LinearLayout page = basePage("Revisão da aula", "Resumo, transcrição e palavras salvas");
        page.addView(sectionTitle("Resumo automático"));
        page.addView(card(paragraph("Resumo demo: a aula abordou tecnologia, dados, sistema, matemática e ciências. Revise os termos pendentes com apoio de especialista em Libras antes de tratar qualquer sinal como oficial.", 16, false)));

        page.addView(sectionTitle("Palavras-chave"));
        page.addView(signCards(extractAllCards()));

        page.addView(sectionTitle("Palavras salvas"));
        if (savedWords.isEmpty()) {
            page.addView(transcriptItem("Nenhuma palavra salva ainda."));
        } else {
            for (String word : savedWords) {
                page.addView(transcriptItem(word));
            }
        }

        page.addView(sectionTitle("Transcrição completa"));
        for (String line : transcript) {
            page.addView(transcriptItem(line));
        }

        LinearLayout actions = vertical(8);
        actions.addView(primaryButton("Aluno", v -> renderStudentLive()));
        actions.addView(outlineButton("Início", v -> renderHome()));
        page.addView(actions);
        show(page);
    }

    private void renderAdmin() {
        LinearLayout page = basePage("Administração", "Curadoria local de sinais");
        page.addView(modeBadge("dados pendentes de curadoria"));

        LinearLayout metrics = vertical(6);
        LinearLayout metricRowOne = horizontal(6);
        metricRowOne.addView(bigMetric("Total", String.valueOf(signs.size())));
        metricRowOne.addView(bigMetric("Aprovados", String.valueOf(countStatus("approved"))));
        LinearLayout metricRowTwo = horizontal(6);
        metricRowTwo.addView(bigMetric("Pendentes", String.valueOf(countStatus("pending"))));
        metricRowTwo.addView(bigMetric("Rejeitados", String.valueOf(countStatus("rejected"))));
        metrics.addView(metricRowOne);
        metrics.addView(metricRowTwo);
        page.addView(metrics);

        LinearLayout importActions = vertical(8);
        importActions.addView(outlineButton("Importar CSV", v -> Toast.makeText(this, "Use o backend para importar CSV autorizado.", Toast.LENGTH_LONG).show()));
        importActions.addView(outlineButton("Importar JSON", v -> Toast.makeText(this, "Use o backend para importar JSON autorizado.", Toast.LENGTH_LONG).show()));
        importActions.addView(outlineButton("Importar via API", v -> Toast.makeText(this, "Configure VLibras/API autorizada no backend.", Toast.LENGTH_LONG).show()));
        page.addView(importActions);

        page.addView(sectionTitle("Tabela de sinais"));
        for (SignItem sign : signs) {
            page.addView(adminSignRow(sign));
        }

        page.addView(noticeCard());
        page.addView(outlineButton("Voltar", v -> renderHome()));
        show(page);
    }

    private View adminSignRow(SignItem sign) {
        LinearLayout row = vertical(8);
        row.addView(text(sign.word, 19, true));
        row.addView(paragraph("Status: " + sign.status + " | Fonte: " + sign.sourceName + " | Licença: " + sign.license, 14, false));
        row.addView(paragraph(sign.notes, 14, false));
        row.addView(primaryButton("Aprovar localmente", v -> {
            sign.status = "approved";
            Toast.makeText(this, sign.word + " aprovado localmente", Toast.LENGTH_SHORT).show();
            renderAdmin();
        }));
        return card(row);
    }

    private List<SignItem> extractCurrentCards() {
        List<SignItem> result = new ArrayList<>();
        String normalized = normalize(currentCaption);
        for (SignItem sign : signs) {
            if (normalized.contains(normalize(sign.word)) && result.size() < 6) {
                result.add(sign);
            }
        }
        if (result.isEmpty()) {
            result.addAll(signs.subList(0, Math.min(4, signs.size())));
        }
        return result;
    }

    private List<SignItem> extractAllCards() {
        LinkedHashSet<SignItem> set = new LinkedHashSet<>();
        for (String line : transcript) {
            String normalized = normalize(line);
            for (SignItem sign : signs) {
                if (normalized.contains(normalize(sign.word))) {
                    set.add(sign);
                }
            }
        }
        if (set.isEmpty()) {
            set.addAll(signs.subList(0, Math.min(6, signs.size())));
        }
        return new ArrayList<>(set);
    }

    private View signCards(List<SignItem> items) {
        LinearLayout wrap = vertical(10);
        for (SignItem item : items) {
            LinearLayout card = vertical(8);
            card.addView(text(item.word, 19, true));
            card.addView(paragraph(item.status.equals("approved") ? "Sinal aprovado localmente" : "Pendente de curadoria por especialista em Libras.", 14, false));
            card.addView(paragraph("Fonte: " + item.sourceName, 13, false));
            card.addView(outlineButton("Salvar palavra", v -> {
                savedWords.add(item.word);
                Toast.makeText(this, "Palavra salva: " + item.word, Toast.LENGTH_SHORT).show();
            }));
            wrap.addView(card(card));
        }
        return wrap;
    }

    private View avatarPanel() {
        LinearLayout box = vertical(10);
        TextView icon = text("Avatar Libras", 22, true);
        icon.setGravity(Gravity.CENTER);
        TextView hand = text("LIBRAS", 34, true);
        hand.setGravity(Gravity.CENTER);
        box.addView(icon);
        box.addView(hand);
        box.addView(paragraph("Fallback visual ativo. Nenhum avatar oficial configurado; a legenda permanece disponível e os sinais sem mídia seguem pendentes de curadoria.", 15, false));
        return card(box);
    }

    private String nextDemoLine() {
        String line = demoLines.get(demoIndex % demoLines.size());
        demoIndex++;
        transcript.add(0, line);
        if (transcript.size() > 12) {
            transcript.remove(transcript.size() - 1);
        }
        return line;
    }

    private int countStatus(String status) {
        int count = 0;
        for (SignItem sign : signs) {
            if (status.equals(sign.status)) {
                count++;
            }
        }
        return count;
    }

    private void ensureMicrophonePermission() {
        if (android.os.Build.VERSION.SDK_INT >= 23 &&
                checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 10);
        }
    }

    private LinearLayout basePage(String title, String subtitle) {
        LinearLayout page = vertical(14);
        page.setPadding(dp(18), dp(18), dp(18), dp(28));
        page.setBackgroundColor(highContrast ? 0xFF000000 : PAPER);

        LinearLayout header = vertical(4);
        header.setBackgroundColor(highContrast ? 0xFF000000 : OCEAN);
        header.setPadding(dp(18), dp(18), dp(18), dp(18));
        TextView logo = text("LibrasLive Edu", 16, true);
        logo.setTextColor(highContrast ? WHITE : MINT);
        TextView titleView = text(title, 28, true);
        titleView.setTextColor(WHITE);
        TextView subtitleView = text(subtitle, 15, false);
        subtitleView.setTextColor(highContrast ? WHITE : 0xFFE7FFFB);
        header.addView(logo);
        header.addView(titleView);
        header.addView(subtitleView);
        page.addView(header);
        return page;
    }

    private void show(LinearLayout page) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(highContrast ? 0xFF000000 : PAPER);
        scroll.addView(page);
        setContentView(scroll);
    }

    private LinearLayout vertical(int gapDp) {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setShowDividers(LinearLayout.SHOW_DIVIDER_NONE);
        layout.setPadding(0, 0, 0, 0);
        layout.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        ));
        layout.setDividerPadding(dp(gapDp));
        return layout;
    }

    private LinearLayout horizontal(int gapDp) {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.HORIZONTAL);
        layout.setGravity(Gravity.CENTER_VERTICAL);
        layout.setPadding(0, dp(2), 0, dp(2));
        layout.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        ));
        return layout;
    }

    private View card(View child) {
        LinearLayout outer = vertical(0);
        outer.setPadding(dp(14), dp(14), dp(14), dp(14));
        outer.setBackground(roundRect(highContrast ? 0xFF000000 : WHITE, highContrast ? WHITE : 0x1A10201C, 1));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, dp(6), 0, dp(6));
        outer.setLayoutParams(params);
        outer.addView(child);
        return outer;
    }

    private View noticeCard() {
        LinearLayout notice = vertical(8);
        notice.addView(text("Apoio à acessibilidade", 18, true));
        notice.addView(paragraph(ACCESSIBILITY_NOTICE, 15, false));
        return card(notice);
    }

    private TextView sectionTitle(String value) {
        TextView view = text(value, 21, true);
        view.setPadding(0, dp(12), 0, dp(4));
        return view;
    }

    private TextView paragraph(String value, int sp, boolean bold) {
        TextView view = text(value, sp, bold);
        view.setLineSpacing(2, 1.05f);
        return view;
    }

    private TextView text(String value, int sp, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(sp);
        view.setTextColor(highContrast ? WHITE : INK);
        view.setTypeface(Typeface.DEFAULT, bold ? Typeface.BOLD : Typeface.NORMAL);
        view.setPadding(0, dp(4), 0, dp(4));
        view.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        ));
        return view;
    }

    private TextView label(String value) {
        TextView label = text(value, 14, true);
        label.setTextColor(highContrast ? WHITE : OCEAN);
        return label;
    }

    private EditText input(String hint, String value) {
        EditText input = new EditText(this);
        input.setHint(hint);
        input.setText(value);
        input.setTextSize(18);
        input.setSingleLine(false);
        input.setMinHeight(dp(54));
        input.setPadding(dp(12), dp(8), dp(12), dp(8));
        input.setTextColor(highContrast ? WHITE : INK);
        input.setHintTextColor(highContrast ? 0xFFDDDDDD : 0xFF6B7280);
        input.setBackground(roundRect(highContrast ? 0xFF000000 : WHITE, highContrast ? WHITE : 0x3310201C, 1));
        return input;
    }

    private Button primaryButton(String value, View.OnClickListener listener) {
        return button(value, highContrast ? WHITE : OCEAN, highContrast ? 0xFF000000 : WHITE, listener);
    }

    private Button secondaryButton(String value, View.OnClickListener listener) {
        return button(value, AMBER, INK, listener);
    }

    private Button outlineButton(String value, View.OnClickListener listener) {
        return button(value, highContrast ? 0xFF000000 : WHITE, highContrast ? WHITE : INK, listener);
    }

    private Button dangerButton(String value, View.OnClickListener listener) {
        return button(value, 0xFFF97316, WHITE, listener);
    }

    private Button button(String value, int bgColor, int textColor, View.OnClickListener listener) {
        Button button = new Button(this);
        button.setText(value);
        button.setAllCaps(false);
        button.setTextSize(16);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setMinHeight(dp(52));
        button.setTextColor(textColor);
        button.setBackground(roundRect(bgColor, highContrast ? WHITE : 0x2210201C, 1));
        button.setOnClickListener(listener);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(dp(3), dp(5), dp(3), dp(5));
        button.setLayoutParams(params);
        return button;
    }

    private View captionBox(String value, int sp) {
        TextView caption = text(value, sp, true);
        caption.setMinHeight(dp(132));
        caption.setGravity(Gravity.CENTER_VERTICAL);
        caption.setTextColor(WHITE);
        caption.setPadding(dp(16), dp(16), dp(16), dp(16));
        caption.setBackground(roundRect(highContrast ? 0xFF000000 : INK, highContrast ? WHITE : 0x00000000, highContrast ? 2 : 0));
        return caption;
    }

    private View transcriptItem(String value) {
        TextView item = paragraph(value, 16, false);
        item.setPadding(dp(12), dp(10), dp(12), dp(10));
        item.setBackground(roundRect(highContrast ? 0xFF000000 : SOFT, highContrast ? WHITE : 0x00000000, highContrast ? 1 : 0));
        return item;
    }

    private View bigMetric(String label, String value) {
        LinearLayout metric = vertical(2);
        metric.setPadding(dp(12), dp(12), dp(12), dp(12));
        metric.setBackground(roundRect(highContrast ? 0xFF000000 : SOFT, highContrast ? WHITE : 0x00000000, highContrast ? 1 : 0));
        metric.addView(paragraph(label, 13, true));
        metric.addView(text(value, 24, true));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
        params.setMargins(dp(3), dp(3), dp(3), dp(3));
        metric.setLayoutParams(params);
        return metric;
    }

    private TextView modeBadge(String value) {
        TextView badge = text(value, 14, true);
        badge.setTextColor(highContrast ? 0xFF000000 : INK);
        badge.setGravity(Gravity.CENTER);
        badge.setPadding(dp(10), dp(8), dp(10), dp(8));
        badge.setBackground(roundRect(highContrast ? WHITE : 0x26F59E0B, highContrast ? WHITE : 0x66F59E0B, 1));
        return badge;
    }

    private GradientDrawable roundRect(int fill, int stroke, int strokeWidth) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setShape(GradientDrawable.RECTANGLE);
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(8));
        if (strokeWidth > 0) {
            drawable.setStroke(dp(strokeWidth), stroke);
        }
        return drawable;
    }

    private String normalize(String value) {
        return value.toLowerCase()
                .replace("á", "a")
                .replace("à", "a")
                .replace("ã", "a")
                .replace("â", "a")
                .replace("é", "e")
                .replace("ê", "e")
                .replace("í", "i")
                .replace("ó", "o")
                .replace("ô", "o")
                .replace("õ", "o")
                .replace("ú", "u")
                .replace("ç", "c");
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private static class SignItem {
        final String word;
        String status;
        final String sourceName;
        final String license;
        final String notes;

        SignItem(String word, String status, String sourceName, String license, String notes) {
            this.word = word;
            this.status = status;
            this.sourceName = sourceName;
            this.license = license;
            this.notes = notes;
        }
    }
}
