// Conteúdo do jogo: itens, personagens, diálogos, pontos de interesse e enigmas.
// Fatos históricos: Real Forte Príncipe da Beira (1776–1783), rotina baseada em documentos citados por
// Suelme Fernandes (2005), Louise Cardoso de Mello (2020/2021) e fontes do IPHAN. Falas e personagens são dramatização.
import { S, G, has, f, setf } from './state.js';

export const TITLE = 'A Planta Perdida de Sambuceti';

// ---------------------------------------------------------------- itens
export const ITEMS = {
  fish:      ['🐟', 'Peixe pintado', 'Um peixe gordo do Guaporé. Moeda de troca respeitada na beira do rio.'],
  quina:     ['🌿', 'Casca de quina', 'Casca amarga, remédio contra as febres do mato. Tiago a tirou de uma árvore que só os remeiros conhecem.'],
  febrifugo: ['🧪', 'Febrífugo', 'Decocção de quina com ruibarbo, preparada pelo boticário. Cheira mal, mas derruba a febre.'],
  chaveArm:  ['🗝️', 'Chave dos Armazéns Reais', 'Chave de ferro pesada, com as armas de Portugal gravadas. Abre os dois armazéns da Fazenda Real.'],
  livro:     ['📖', 'Livro de Registro', 'O livro-razão dos Armazéns Reais: entradas, saídas, rações e soldos. Sem ele não há prestação de contas ao governador.'],
  fio:       ['🧵', 'Fio de algodão', 'Fio grosso de algodão, usado para coser sacos... e bandeiras.'],
  tintas:    ['🎨', 'Tintas de madeira', 'Tinturas vegetais vermelha e azul, das que coloram as camisas da guarnição.'],
  fumo:      ['🚬', 'Rolo de fumo', 'Fumo de corda. Os soldados trocam por quase tudo.'],
  bandeiraRasgada: ['🏳️', 'Bandeira real rasgada', 'A bandeira do forte, comida pela umidade do rio. Precisa de linha e de cor.'],
  bandeira:  ['🚩', 'Bandeira real restaurada', 'Branca, com o escudo real, costurada com capricho por mestre Faustino.'],
  frag1:     ['📜', 'Fragmento I da Planta', 'Canto noroeste da planta: o baluarte e a cortina do portão, em nanquim.'],
  frag2:     ['📜', 'Fragmento II da Planta', 'Canto nordeste: baluarte, parque de artilharia, rosa dos ventos e a escala em varas.'],
  frag3:     ['📜', 'Fragmento III da Planta', 'Canto sudoeste: hospital, botica e capela.'],
  frag4:     ['📜', 'Fragmento IV da Planta', 'Canto sudeste: armazéns, alojamentos e uma marca em X perto da praça.'],
  planta:    ['🗺️', 'Planta de Sambuceti', 'A planta completa do forte. Uma anotação do engenheiro e uma cruz marcam a cisterna.'],
  chavePaiol:['🔑', 'Chave do Paiol', 'Pequena, de ferro escuro. Abre a porta da casa de pólvora, mas há um cadeado de combinação.'],
  chaveResid:['🗝️', 'Chave da Residência', 'Entregue pelo comandante: abre a casa do governador, onde Sambuceti deixou papéis.'],
  polvora:   ['🛢️', 'Barril de pólvora', 'Pólvora seca e bem guardada. Dá para a salva de onze tiros.'],
  carta:     ['✉️', 'Carta de Sambuceti', 'A última carta do engenheiro genovês, escrita já com febre.'],
};

// ---------------------------------------------------------------- personagens
export const NPCS = {
  tiago:     { name: 'Tiago', role: 'Remeiro indígena', sprite: 'tiago', hub: 'tiago.hub' },
  maneco:    { name: 'Maneco', role: 'Pescador do Guaporé', sprite: 'pescador', hub: 'maneco.hub' },
  manuel:    { name: 'Soldado Manuel', role: 'Sentinela do portão', sprite: 'soldado', hub: 'manuel.hub' },
  ricardo:   { name: 'Ricardo Franco de Almeida Serra', short: 'Capitão Ricardo Franco', role: 'Capitão-engenheiro', sprite: 'ricardo', hub: 'ricardo.hub' },
  melo:      { name: 'José de Melo de Souza Castro e Vilhena', short: 'Comandante Melo', role: 'Capitão de dragões, comandante', sprite: 'melo', hub: 'melo.hub' },
  romao:     { name: 'Cabo Romão', role: 'Cabo de ronda', sprite: 'soldado', hub: 'romao.hub' },
  domingos:  { name: 'Alferes Domingos', role: 'Alferes de pedestres', sprite: 'pedestre', hub: 'domingos.hub' },
  quirino:   { name: 'Quirino', role: 'Pedreiro da Fazenda Real', sprite: 'pedreiro', hub: 'quirino.hub' },
  sebastiao: { name: 'Sebastião', role: 'Lavrador das roças', sprite: 'lavrador', hub: 'sebastiao.hub' },
  inacio:    { name: 'Inácio Batista', role: 'Sangrador do hospital', sprite: 'inacio', hub: 'inacio.hub' },
  joaquim:   { name: 'Joaquim Mendes', role: 'Almoxarife (doente)', sprite: 'almoxarife', hub: 'joaquim.hub' },
  anacleto:  { name: 'Anacleto', role: 'Boticário', sprite: 'boticario', hub: 'anacleto.hub' },
  anselmo:   { name: 'Padre Anselmo', role: 'Capelão', sprite: 'padre', hub: 'anselmo.hub' },
  rosa:      { name: 'Dona Rosa', role: 'Cozinheira forra', sprite: 'cozinheira', hub: 'rosa.hub' },
  faustino:  { name: 'Mestre Faustino', role: 'Alfaiate', sprite: 'alfaiate', hub: 'faustino.hub' },
  luis:      { name: 'Luís de Albuquerque', role: 'Capitão-general de Mato Grosso', sprite: 'governador', hub: null },
};

// ---------------------------------------------------------------- diálogos
export const NODES = {};
const n = (id, text, opts = [], fn) => { NODES[id] = { id, text, opts, fn }; };
const bye = ['Até logo.', null];
const items3 = () => has('livro') && has('planta') && has('bandeira') && has('polvora');

// ---- Tiago, o remeiro (porto)
n('tiago.first', `Tiago encosta a canoa no cais e apoia o remo.||"Chegamos, escrivão. Semanas de remo, dezessete cachoeiras com a canoa nos ombros. O forte fica ali, no fim da estrada."||"Um conselho: se algum doente precisar de quina, traga-me um peixe gordo. Eu o levo à árvore certa. Os brancos dizem que a casca é remédio; meu povo já sabia disso antes de os senhores chegarem."`,
  [['Obrigado, Tiago.', null]], () => setf('metTiago'));
n('tiago.hub', `"Pergunte, escrivão. Enquanto a canoa seca, eu converso."`, [
  ['Como é a vida de remeiro?', 'tiago.rotina'],
  ['O que o rio traz para o forte?', 'tiago.rio'],
  ['Sobre a quina…', 'tiago.quina'],
  ['Trocar o peixe por casca de quina', 'tiago.troca', { if: () => has('fish') && !f('quinaOk') }],
  bye]);
n('tiago.rotina', `"Acordamos antes do sol. Remo até o calor apertar, descanso na sombra, farinha e peixe seco. Quando a cachoeira chega, descarregamos tudo, arrastamos a canoa por terra e carregamos de novo. São dezessete cachoeiras entre o Madeira e o Guaporé."||"Muitos remeiros foram arrancados das aldeias. Eu vim por troca: remo para o forte em troca de ferramentas e panos para a minha gente. Não é justo, mas é o que o tempo me deu."`,
  [['Voltar', 'tiago.hub']]);
n('tiago.rio', `"Belém fica a mais de quinhentas léguas rio abaixo; Vila Bela, a umas cem rio acima. De lá vêm sal, ferro, fazendas e aguardente; para lá vão o ouro e as notícias. Quando o rio enche, o forte vira ilha; quando seca, vira poeira."||"E do outro lado, nas missões espanholas de Mojos, há quem troque louça e tecido por ouro, às escondidas. O comandante finge que não vê."`,
  [['Voltar', 'tiago.hub']]);
n('tiago.quina', `"A quina é uma árvore de casca amarga. Fervida, derruba as febres do mato. A botica do forte gastou tudo, eu soube. Traga-me um peixe fresco e eu volto com a casca."`,
  [['Voltar', 'tiago.hub']], () => setf('quinaHint'));
n('tiago.troca', `"Peixe pintado! Esse é bom. Espere aqui."||Tiago some no mato e volta com um punhado de casca amarga.||"Tome. Diga ao boticário que ferva e coe, e que não dê dose dupla ao rapaz da enfermaria."`,
  [['Obrigado, Tiago.', null]], () => { G.take('fish'); G.give('quina'); setf('quinaOk'); });

// ---- Maneco, o pescador (porto)
n('maneco.hub', `"Bom dia! Se o rio estiver generoso, hoje tem peixe."`, [
  ['Posso tentar a vara?', null, { mg: ['pesca', 'maneco.pegou', 'maneco.perdeu'], if: () => !has('fish') }],
  ['Como é seu dia de pescador?', 'maneco.rotina'],
  ['Para que serve o azeite de boto?', 'maneco.azeite'],
  ['Tenho um rolo de fumo para você', 'maneco.fumo', { if: () => has('fumo') && !has('frag3') && !f('frag3Got') }],
  bye]);
n('maneco.rotina', `"Saio antes de clarear: a água está fria e o peixe, preguiçoso. Pego pintado, pacu, piraíba. O que sobra eu salgo e levo ao forte; o almoxarife anota no livro e paga em sal ou em pano."||"Quando o rio enche, as roças alagam e o forte fica difícil de abastecer. Aí o peixe é o que segura a guarnição."`,
  [['Voltar', 'maneco.hub']]);
n('maneco.azeite', `"Do boto e da tartaruga sai o azeite que acende os quartéis. Sem azeite a noite no forte é escura demais, e soldado no escuro faz bobagem. Também dá para fazer sabão."`,
  [['Voltar', 'maneco.hub']]);
n('maneco.pegou', `"Isso! Um pintado de respeito. Pode levar."`, [['Obrigado!', null]], () => G.give('fish'));
n('maneco.perdeu', `"Quase! O peixe é teimoso. Tente de novo quando quiser."`, [['Voltar', 'maneco.hub']]);
n('maneco.fumo', `"Fumo de corda! Fazia meses que não via um desses. Então eu lhe devo uma. Quando o fosso baixou, achei na lama um frasco de couro com um pergaminho rasgado. Dizem que é obra do falecido engenheiro."`,
  [['Obrigado, Maneco.', null]], () => { G.take('fumo'); G.give('frag3'); setf('frag3Got'); });

// ---- Soldado Manuel (sentinela do portão)
n('manuel.first', `"Alto lá! Ah, o escrivão de Vila Bela. Esperávamos o senhor."||"O capitão-engenheiro Ricardo Franco está no parque de artilharia, no norte da praça, à esquerda de quem entra. Ele vai explicar tudo."`,
  [['Obrigado.', null]], () => setf('sentinelTold'));
n('manuel.hub', `"Em que posso servi-lo, senhor escrivão?"`, [
  ['Como é o serviço de sentinela?', 'manuel.rotina'],
  ['O que come a guarnição?', 'manuel.racao'],
  ['E o soldo?', 'manuel.soldo'],
  bye]);
n('manuel.rotina', `"Quatro horas de guarda, quatro de descanso. De dia o sol racha a cabeça; de noite os mosquitos comem a gente viva. Só o tambor da alvorada e o sino da capela me dizem que horas são. Ando descalço: bota de couro apodrece nesta umidade."`,
  [['Voltar', 'manuel.hub']]);
n('manuel.racao', `"Ração regular: farinha de milho, feijão, arroz, sal e um trago de aguardente. Quando o feijão falta, o comandante manda repartir fumo para a tropa se animar. A barriga vazia aprende a gostar de fumo."`,
  [['Voltar', 'manuel.hub']]);
n('manuel.soldo', `"O soldo atrasa. Quando chega, já deve tudo à Provedoria: camisa, calção, fumo, tudo fiado. Quem tem um escravo de ganho vive melhor. Eu só tenho meu mosquete e esta cara."`,
  [['Voltar', 'manuel.hub']]);

// ---- Capitão Ricardo Franco
n('ricardo.intro', `"Antônio Nunes? Graças a Deus. Sou Ricardo Franco de Almeida Serra, capitão-engenheiro. Assumi a obra quando as febres levaram o genovês Sambuceti. Dentro de três dias o capitão-general Luís de Albuquerque chega para inaugurar o Real Forte Príncipe da Beira — e o forte ainda não está pronto."||"Preciso de quatro coisas: o Livro de Registro dos Armazéns Reais; a planta original de Sambuceti, rasgada em pedaços e espalhada; pólvora para a salva de onze tiros; e uma bandeira real decente. Esta a umidade comeu. Leve ao alfaiate quando tiver linha e tinta."||"Comece pelo almoxarife, Joaquim Mendes. Ele guarda a chave dos armazéns e sabe onde estão os papéis. Está no hospital, junto à muralha oeste, à direita de quem entra. E, escrivão: fale com todos. A vida do forte é feita de gente."`,
  [['Entendido, capitão.', null]], () => { setf('briefed'); G.give('bandeiraRasgada'); });
n('ricardo.hub', () => items3() ? `"Escrivão... o senhor trouxe tudo?"` : `"O tempo corre, escrivão. O que precisa saber?"`, [
  ['Estou com tudo pronto, capitão.', 'ricardo.final', { if: () => items3() && f('act1done') }],
  ['Como se construiu este forte?', 'ricardo.obra'],
  ['Como é o seu dia?', 'ricardo.rotina'],
  ['E os trabalhadores da obra?', 'ricardo.gente'],
  ['O que ainda falta?', 'ricardo.falta'],
  bye]);
n('ricardo.obra', `"O desenho é de escola Vauban: quatro baluartes, cortinas de cantaria de uns dez metros, fosso alimentado pelo rio. Escolhemos este terreno em 1773 depois que a enchente de 1771 derrubou o fortim da Conceição, dois quilômetros acima. A pedra fundamental foi lançada em 1776, e o projeto mudou várias vezes no caminho."||"Sambuceti mandou erguer primeiro os armazéns, depois o calabouço e o corpo de guarda. O forte nasceu menos como castelo e mais como feitoria com muralha."`,
  [['Voltar', 'ricardo.hub']]);
n('ricardo.rotina', `"Acordo antes do toque da alvorada. Percorro as obras, confiro cantaria, taipa e telhas, escrevo ao governador. À tarde discuto os planos com o comandante. À noite, faço contas à luz de azeite de boto. Raramente durmo mais que cinco horas."`,
  [['Voltar', 'ricardo.hub']]);
n('ricardo.gente', `"Começamos com 43 africanos escravizados. Cinco anos depois eram mais de cento e cinquenta, quase metade da Fazenda Real, a maioria vinda da Alta Guiné. Com eles, indígenas e brancos pobres. Centenas morreram, quase todos de malária. O forte tem de ser lembrado também por eles."`,
  [['Voltar', 'ricardo.hub']]);
n('ricardo.falta', () => {
  const l = [];
  if (!has('livro')) l.push('o Livro de Registro'); if (!has('planta')) l.push('a planta completa');
  if (!has('bandeira')) l.push('a bandeira restaurada'); if (!has('polvora')) l.push('a pólvora do paiol');
  return l.length ? `"Falta-nos: ${l.join(', ')}. Consulte o Diário, que anota tudo."` : `"Nada! Venha falar comigo quando quiser começar a cerimônia."`;
}, [['Voltar', 'ricardo.hub']]);
n('ricardo.final', `"Livro, planta, bandeira e pólvora. O senhor é mais valioso que meia companhia de dragões, Antônio. Chame os homens: a cerimônia começa na madrugada, antes que o nevoeiro suba."`,
  [['Vamos à praça.', null, { do: () => G.startFinale() }]]);

// ---- Comandante Melo
n('melo.hub', () => f('residOpen') ? `"Sua Excelência estará aqui em breve. Em que posso ajudar?"` : `"Escrivão. Sou o responsável pela guarnição deste forte. Fale."`, [
  ['Trouxe o Livro de Registro.', 'melo.livro', { if: () => has('livro') && !f('residOpen') }],
  ['Preciso entrar na residência.', 'melo.resid', { if: () => !f('residOpen') && !has('livro') }],
  ['Tenho uma suspeita sobre o furto de 1778.', 'melo.acusar', { if: () => f('clueEscada') && f('clueFumo') && f('clueFecho') && !f('justica') }],
  ['Como é a rotina da guarnição?', 'melo.rotina'],
  ['Quem serve neste forte?', 'melo.tropa'],
  ['E a fronteira com a Espanha?', 'melo.fronteira'],
  bye]);
n('melo.livro', `Melo folheia o livro com a testa franzida.||"As entradas e saídas conferem, falta apenas a assinatura do almoxarife. Servirá. Tome a chave da residência: o engenheiro Sambuceti deixou papéis sobre a mesa que nenhum de nós quis mexer."`,
  [['Obrigado, comandante.', null]], () => { G.give('chaveResid'); setf('residOpen'); });
n('melo.resid', `"A residência está trancada, e a chave é minha. Só abro para quem trouxer o Livro de Registro: não admito inauguração com os armazéns sem contas."`,
  [['Voltar', 'melo.hub']]);
n('melo.rotina', `"Toque de alvorada, formatura na praça, rondas nas cortinas, guarda do portão, missa aos domingos e dias santos. À noite, o sino marca as horas e o fosso protege o que o escuro esconde. Disciplina é o que separa uma guarnição de um bando."`,
  [['Voltar', 'melo.hub']]);
n('melo.tropa', `"Oficiais, quase sempre dragões, formados em Portugal; serviço na fronteira pode render nobilitação. A tropa de linha é de colonos pobres, forros e degredados. Os pedestres, mulatos e indígenas descalços e armados de facão, são os mais úteis: rios e matas são o terreno deles."`,
  [['Voltar', 'melo.hub']]);
n('melo.fronteira', `"Do outro lado ficam as missões de Mojos e Chiquitos. Há trocas que não devem existir, soldados e escravizados que fogem para lá, e gente de lá que foge para cá. O rio é fronteira e é estrada. Combate mesmo, até agora, nenhum."`,
  [['Voltar', 'melo.hub']]);
n('melo.acusar', `"O furto do armazém... cinco anos de poeira. Houve devassa: dois cativos foram acusados sem prova. Quem o senhor acusa?"`, [
  ['O cabo Romão', 'melo.errado'],
  ['O soldado Gaspar, carpinteiro', 'melo.certo'],
  ['Os dois cativos acusados à época', 'melo.errado'],
  ['Ninguém. Faltam provas.', 'melo.hub']]);
n('melo.errado', `"Hum. Não vejo como isso se sustenta, escrivão. Repasse suas pistas: escada, fumo e fechadura."`, [['Voltar', 'melo.hub']]);
n('melo.certo', `"Gaspar... a escada, o fumo, a fechadura forçada. Faz sentido. Mandarei interrogá-lo e anotar no livro que os dois cativos foram injustamente acusados. É tarde, mas é justiça."`,
  [['Obrigado, comandante.', null]], () => { setf('justica'); G.toast('Justiça feita: os cativos foram inocentados.'); });

// ---- Cabo Romão
n('romao.hub', `"Cabo Romão, ao seu dispor. Faço a ronda da praça."`, [
  ['Como é uma ronda?', 'romao.rotina'],
  ['Como se treina a tropa?', 'romao.treino'],
  ['O furto de 1778 ainda é comentado?', 'romao.furto'],
  bye]);
n('romao.rotina', `"Ronda de hora em hora: portão, adarve, baluartes, praça. Verifico se as sentinelas estão acordadas e se o fogo da cozinha está apagado. De noite, ouvir o rio ajuda a não dormir."`,
  [['Voltar', 'romao.hub']]);
n('romao.treino', `"Manejo de mosquete, marcha, formatura. O regulamento é prussiano, mas aqui ninguém marcha de bota: marchamos descalços mesmo. O que importa é carregar e atirar sem tremer."`,
  [['Voltar', 'romao.hub']]);
n('romao.furto', `"Ah, o roubo! Em 1778 levaram camisetas, calções, sal, fumo, facões e uma fechadura. Na noite seguinte percebemos que a escada comprida do alojamento tinha sumido. Gaspar, o carpinteiro, foi quem a recolheu de manhã, sem uma palavra. Sempre achei estranho."`,
  [['Voltar', 'romao.hub']], () => { setf('clueEscada'); G.toast('Pista: a escada sumiu (Gaspar a recolheu).'); });

// ---- Alferes Domingos (pedestre, perto da casa de pólvora)
n('domingos.hub', `"Alferes Domingos, de pedestres. Guardo o paiol e vigio a mata."`, [
  ['O que fazem os pedestres?', 'domingos.rotina'],
  ['Por que andam descalços?', 'domingos.pes'],
  ['Sobre o paiol…', 'domingos.paiol'],
  bye]);
n('domingos.rotina', `"Somos mulatos e indígenas que conhecem rio e mata. Remamos, espiamos o lado espanhol, fazemos rondas e levamos recados. Muita gente de farda chega aqui e não sabe andar na lama sem cair."`,
  [['Voltar', 'domingos.hub']]);
n('domingos.pes', `"Bota apodrece, chinelo escorrega. Pé descalço sente o chão e não faz barulho. Facão é a nossa ferramenta e a nossa arma, serve para abrir mata e abrir caminho."`,
  [['Voltar', 'domingos.hub']]);
n('domingos.paiol', `"A pólvora fica longe das muralhas: se pegar fogo, o forte não vai junto. A porta tem uma chave e um cadeado de combinação. Sambuceti dizia que só abre quem entende de forte: contar os baluartes, contar as bocas de fogo de cada um e medir a altura da muralha em metros."`,
  [['Voltar', 'domingos.hub']], () => setf('hintCode'));

// ---- Quirino, pedreiro
n('quirino.hub', `"Mestre Quirino, pedreiro da Fazenda Real. Posso falar enquanto bato."`, [
  ['Como é o trabalho de cantaria?', 'quirino.trabalho'],
  ['Como é seu dia?', 'quirino.rotina'],
  bye]);
n('quirino.trabalho', `"Cada bloco de pedra canga é lavrado, medido e assentado com cal que veio de Cuiabá. Há mais de cento e trinta ferramentas de pedreiro nos armazéns. Os soquetes servem para socar o chão de terra batida dos quartéis e das casas."`,
  [['Voltar', 'quirino.hub']]);
n('quirino.rotina', `"Acordo no escuro, bato pedra até o sol bater em mim. Quando a febre pega um companheiro, a gente ajuda a carregar. Ao fim do dia, ainda sobra canto: canto baixinho pra esquecer o cansaço. O muro que sobe tem a minha mão, mas não tem o meu nome."`,
  [['Voltar', 'quirino.hub']]);

// ---- Sebastião, lavrador
n('sebastiao.hub', `"Sebastião, das roças. Cuido da terra que alimenta o forte."`, [
  ['O que se planta aqui?', 'sebastiao.roca'],
  ['Como é seu dia?', 'sebastiao.rotina'],
  bye]);
n('sebastiao.roca', `"Milho, feijão, mandioca, arroz, algum algodão e cana para o engenho. Metade do que a guarnição come sai destas roças, a outra metade vem de Vila Bela ou de trocas que ninguém registra."`,
  [['Voltar', 'sebastiao.hub']]);
n('sebastiao.rotina', `"Capina antes do sol esquentar, plantio, colheita, carrego de sacos para o armazém. Quando o rio enche, perdemos metade. O feitor mede tudo, mas a terra não negocia."`,
  [['Voltar', 'sebastiao.hub']]);

// ---- Inácio Batista, sangrador
n('inacio.hub', `"Inácio Batista, sangrador do hospital. Atendo os doentes."`, [
  ['Como é o trabalho no hospital?', 'inacio.rotina'],
  ['Como se tratam as febres?', 'inacio.febres'],
  ['Por que o senhor é tão respeitado?', 'inacio.ordem'],
  bye]);
n('inacio.rotina', `"Sangrias, purgas, curativos, panos limpos, água fervida. A cada manhã conto os leitos cheios. Desde que as chuvas começaram, não há um dia sem febre."`,
  [['Voltar', 'inacio.hub']]);
n('inacio.febres', `"A quina é a rainha. Quando falta, tentamos chá, pedra-ume, jalapa e ruibarbo. Ruibarbo alivia o estômago; jalapa é forte demais para quem já está fraco. A quina da botica acabou, e o almoxarife piora a cada hora."`,
  [['Voltar', 'inacio.hub']]);
n('inacio.ordem', `"Por ordem do capitão-general, ninguém me castiga nem me põe em outro serviço sem autorização dele, porque sou necessário aqui. É uma proteção. Não é liberdade, mas é o que consegui."`,
  [['Voltar', 'inacio.hub']]);

// ---- Joaquim Mendes, almoxarife (hospital)
n('joaquim.hub', () => has('febrifugo') ? `Joaquim suspira, os olhos fundos.||"Isso é... é remédio?"` : `"Escrivão... desculpe a figura. A febre me pegou no meio do inventário."`, [
  ['Dar o febrífugo ao almoxarife', 'joaquim.cura', { if: () => has('febrifugo') }],
  ['Sobre os armazéns…', 'joaquim.armazem'],
  ['Como é seu dia de almoxarife?', 'joaquim.rotina'],
  ['Qual o problema do furto de 1778?', 'joaquim.furto'],
  bye], () => setf('sawAlmox'));
n('joaquim.rotina', `"Abro os armazéns na alvorada, confiro sacos e barris, anoto entradas e saídas no livro, distribuo rações à tropa e aos escravizados d'El Rey. Guardo sal, açúcar, farinha de milho, feijão, arroz, aguardente, algodão, breu, quina e azeites. Uma conta errada e o governador me manda embora."`,
  [['Voltar', 'joaquim.hub']]);
n('joaquim.armazem', `"Os armazéns são o coração do forte, escrivão. Um guarda mantimentos, o outro petrechos e armamento. Sem o livro, não posso provar que cada saco foi para a boca certa. Se me curar, a chave é sua, e o livro está lá, num caixote lacrado."`,
  [['Voltar', 'joaquim.hub']]);
n('joaquim.furto', `"Em 1778 roubaram do armazém: seis camisetas de algodão, três calções, uma fechadura, um quarto de sal, sete ou oito varas de fumo e dois facões. Entraram pelo telhado, com uma escada. Dois cativos foram acusados sem provas. Nunca me convenceu."`,
  [['Voltar', 'joaquim.hub']]);
n('joaquim.cura', `Joaquim bebe devagar. Alguns minutos depois, a cor volta ao rosto.||"Santo remédio. A cabeça clareou. Tome a chave dos armazéns, escrivão: o Livro de Registro está num caixote lacrado no armazém de mantimentos. Há fio e tinta nas prateleiras, e fumo, se precisar trocar por favores."||"Cuidado com o telhado do armazém de petrechos: tem marcas antigas. Eu nunca esqueci."`,
  [['Obrigado, Joaquim.', null, { do: () => G.nextAct(2) }]], () => { G.take('febrifugo'); G.give('chaveArm'); setf('act1done'); });

// ---- Boticário Anacleto
n('anacleto.hub', () => has('quina') ? `"Quina! Finalmente. Posso preparar um febrífugo agora mesmo."` : `"Boticário Anacleto. A quina acabou, e o hospital me cobra."`, [
  ['Preparar o febrífugo', null, { if: () => has('quina') && !has('febrifugo') && !f('febriOk'), mg: ['botica', 'anacleto.ok', 'anacleto.falhou'] }],
  ['Como funciona a botica?', 'anacleto.rotina'],
  ['Onde acho quina?', 'anacleto.onde', { if: () => !has('quina') && !f('quinaOk') }],
  bye], () => setf('sawBotic'));
n('anacleto.rotina', `"Moo, fervo e coo. Guardo quina, jalapa, ruibarbo, pedra-ume, óleos e unguentos. Muitas receitas vêm de Lisboa; as melhores aprendi com o povo do sertão: raízes, cascas e resinas que ninguém escreveu em livro."`,
  [['Voltar', 'anacleto.hub']]);
n('anacleto.onde', `"A quina de cá é casca de árvore do mato; os remeiros sabem onde ela fica. Tiago, no porto, tem fama disso, mas só troca por peixe fresco. Quando tiver a casca, volte e eu preparo o febrífugo."`,
  [['Voltar', 'anacleto.hub']]);
n('anacleto.ok', `"Quina contra a febre, ruibarbo para o estômago. Certo! Aqui está o febrífugo, ainda morno. Leve ao almoxarife depressa."`,
  [['Obrigado!', null]], () => { G.take('quina'); G.give('febrifugo'); setf('febriOk'); });
n('anacleto.falhou', `"Não, não! Receita errada pode matar o paciente. Releia a receita: contra a febre, quina; contra o enjoo da quina, algo que acalme o ventre."`,
  [['Voltar', 'anacleto.hub']]);

// ---- Padre Anselmo
n('anselmo.hub', `"A paz esteja com o senhor, escrivão. A capela é pequena, mas aqui rezamos em quatro línguas."`, [
  ['Como é a rotina da capela?', 'anselmo.rotina'],
  ['Como a fé ajuda numa fronteira?', 'anselmo.fe'],
  ['O senhor guarda algum papel de Sambuceti?', 'anselmo.frag', { if: () => f('briefed') && !f('frag1Got') }],
  bye]);
n('anselmo.rotina', `"Missa aos domingos e dias santos, batismos, casamentos, enterros demais. Quando morre alguém de febre, os sinos dobram de meia em meia hora. Quando o rei ou o príncipe morrem, dobram por três dias."`,
  [['Voltar', 'anselmo.hub']]);
n('anselmo.fe', `"Na ponta do império, sem cidade, sem lei próxima, a fé é o que sobra. Levamos a bandeira do Divino e uma imagem de Nossa Senhora da Esperança nas expedições. Os indígenas, os africanos e os brancos rezam diferente, mas rezam juntos."`,
  [['Voltar', 'anselmo.hub']]);
n('anselmo.frag', `"Sambuceti me confiou um pedaço de papel dentro do breviário, antes de morrer. Só o entrego a quem souber a história do forte. Responda: em que data foi lançada a pedra fundamental?"`, [
  ['19 de abril de 1775', 'anselmo.errado'],
  ['20 de junho de 1776', 'anselmo.certo'],
  ['20 de agosto de 1783', 'anselmo.errado']]);
n('anselmo.errado', `"Não, meu filho. Releia as inscrições da praça. A pedra fundamental e a inauguração são dias diferentes."`, [['Voltar', 'anselmo.hub']]);
n('anselmo.certo', `"Isso! 20 de junho de 1776. Aqui está: guarde bem este pedaço. O engenheiro dizia que a planta inteira mostra onde ele escondeu a chave do paiol."`,
  [['Amém, padre.', null]], () => { G.give('frag1'); setf('frag1Got'); });

// ---- Dona Rosa, cozinheira
n('rosa.hub', `"Dona Rosa, da cozinha. Sente-se... bom, não temos cadeira, mas o ouvido é de graça."`, [
  ['Como é seu dia na cozinha?', 'rosa.rotina'],
  ['O que a guarnição come?', 'rosa.comida'],
  ['Comentam o furto de 1778?', 'rosa.furto'],
  bye]);
n('rosa.rotina', `"Levanto antes do galo. Acendo o fogo, lavo as panelas de barro, escolho feijão, pilo milho. Um dia comum: cem bocas e uma pergunta, 'o que tem hoje, Dona Rosa?'. A resposta é sempre feijão."`,
  [['Voltar', 'rosa.hub']]);
n('rosa.comida', `"Farinha de milho ou de mandioca, feijão, arroz, peixe do rio, caça quando aparece, rapadura. De beber, aguardente de cana e água fervida. Quando o feijão acaba, o comandante manda repartir fumo, e eu fico com a fama de feiticeira, porque o rancho fica quieto."`,
  [['Voltar', 'rosa.hub']]);
n('rosa.furto', `"Daquele roubo eu lembro: na semana seguinte, Gaspar, o carpinteiro, que vivia devendo aguardente, quitou tudo com sete varas de fumo. Eu vi com estes olhos que a terra há de comer. Disseram que foi um escravo, mas ninguém perguntou a quem sobrou fumo."`,
  [['Voltar', 'rosa.hub']], () => { setf('clueFumo'); G.toast('Pista: Gaspar pagou a dívida com fumo.'); });

// ---- Mestre Faustino, alfaiate
n('faustino.hub', `"Mestre Faustino. Já fui pedreiro; hoje costuro. Os braços cansaram, as mãos aprenderam outra coisa."`, [
  ['Entregar bandeira, fio e tintas', 'faustino.bandeira', { if: () => has('bandeiraRasgada') && has('fio') && has('tintas') && !has('bandeira') }],
  ['Como é o ofício de alfaiate?', 'faustino.rotina'],
  ['O que o senhor costura para a tropa?', 'faustino.farda'],
  bye]);
n('faustino.rotina', `"Cortar, medir, coser. Remendo camisetas, ajusto calções, firmo botões. A luz é de azeite, a agulha é pequena, o dia nunca basta."`,
  [['Voltar', 'faustino.hub']]);
n('faustino.farda', `"Camisetas e calções de algodão, quase sempre tingidos com tintura de madeira para disfarçar o suor e a sujeira. Farda de verdade quase não existe aqui; os oficiais mandam vir de Lisboa. Os pedestres dispensam, e andam como Deus mandou."`,
  [['Voltar', 'faustino.hub']]);
n('faustino.bandeira', `Faustino estende a bandeira sobre a mesa e examina o rasgo.||"A umidade comeu a ponta. Linha, tinta, cuidado."||Horas de costura, uma lua cheia de paciência. Por fim ele ergue o pano branco com o escudo real novamente vivo.||"Pronta. Que o capitão-general a veja de longe."`,
  [['Obrigado, mestre.', null]], () => { G.take('bandeiraRasgada'); G.take('fio'); G.take('tintas'); G.give('bandeira'); setf('bandeiraOk'); });

// ---- finale: governador
export const FINALE = {
  intro: [
    'Madrugada de 20 de agosto de 1783. O nevoeiro sobe do Guaporé. Na praça, a tropa formada, descalça, remendada, em linha.',
    'O capitão Ricardo Franco olha para o senhor: "A bandeira, escrivão."',
  ],
  afterFlag: ['A bandeira real sobe ao mastro e se abre ao vento. Ao longe, a canoa do capitão-general se aproxima do cais.', '"Pólvora nos canhões! Onze tiros!"'],
  afterSalva: ['O estrondo ecoa pelo rio. Aves levantam voo de toda a margem. Os soldados erguem os olhos; alguns choram.'],
  governor: [
    'Luís de Albuquerque desce da escolta, olha a muralha e ergue a mão.',
    '"Em nome de Sua Majestade a Rainha Dona Maria I, e em honra de Sua Alteza o Príncipe da Beira, declaro inaugurado este Real Forte."',
    'Ele abre a planta de Sambuceti sobre um tambor e examina o Livro de Registro. "As contas estão em ordem. A obra, não. Mas está de pé. Que o engenheiro genovês seja lembrado."',
  ],
};
export const EPILOGUE = [
  'O Real Forte Príncipe da Beira nunca travou um combate. Serviu por mais de um século como sentinela, feitoria e prisão de uma fronteira feita de rio.',
  'Com a Proclamação da República, em 1889, ficou sem apoio. Foi abandonado e saqueado: canhões e o grande sino de bronze foram levados.',
  'Em 1914, a Comissão Rondon encontrou as ruínas cobertas pela mata. Em 1950, o IPHAN o tombou. Hoje é candidato a Patrimônio Mundial da UNESCO, entre 19 fortificações brasileiras.',
  'Nas ruínas, os arqueólogos acharam louças, vidros, metais e restos de vida cotidiana: de soldados, de indígenas, de africanos escravizados e de seus descendentes. Foram eles que ergueram o forte.',
];
export const CREDITS = 'Dramatização histórica. Personagens documentados: Ricardo Franco de Almeida Serra, Luís de Albuquerque, José de Melo de Souza Castro e Vilhena, Domingos Sambuceti e Inácio Batista. Os demais e os diálogos são fictícios, inspirados em registros reais. Sprites e texturas gerados no Higgsfield.';

// ---------------------------------------------------------------- pontos estratégicos (Códice)
// pos: {x,y,z} absoluto ou {b: nome do edifício, fx, fz}
export const INFO = [
  { id: 'rio', title: 'Rio Guaporé e a Monção do Norte', pos: { x: 195, y: 0.3, z: -111 }, text: `Pelo Guaporé e pelo Madeira subiam as canoas da Monção do Norte, ligando Belém a Vila Bela. Eram dezessete cachoeiras, com cargas e canoas arrastadas por terra. Os remeiros, quase todos indígenas, sustentavam o comércio da fronteira. Do Pará a Vila Bela são mais de 3.600 km de rio.` },
  { id: 'ponte', title: 'Ponte levadiça e fosso', pos: { x: 0, y: 0.3, z: -72 }, text: `O fosso era alimentado pelas águas do rio. A ponte levadiça, baixada de dia e erguida à noite, era a única passagem. Pilares de cantaria e correntes sobre o frontispício sustentavam o tabuleiro.` },
  { id: 'portao', title: 'Portão principal', pos: { x: 0, y: 0.3, z: -60 }, text: `Túnel abobadado sob frontispício de cantaria, com frontão triangular e pilastras. Ao lado funcionavam o corpo de guarda e o calabouço, dois dos primeiros edifícios erguidos por Sambuceti.` },
  { id: 'muralha', title: 'Muralhas de cantaria', pos: { x: 6, y: 0.3, z: -50.5 }, text: `As muralhas chegam a 10 metros de altura (algumas fontes citam 7) e o perímetro passa de 970 metros. A pedra é arenito laterítico da região, a "pedra canga". Cada bloco foi lavrado e assentado por centenas de mãos, sobretudo de africanos escravizados e indígenas.` },
  { id: 'fundacao', title: 'Marco da pedra fundamental', pos: { x: -6, y: 0.3, z: -50.5 }, text: `Abril de 1775: 43 africanos escravizados começam a limpar o terreno. 20 de junho de 1776: lança-se a pedra fundamental. 20 de agosto de 1783: inauguração, ainda com a obra incompleta. O forte homenageia D. José, Príncipe da Beira, filho de D. Maria I.` },
  { id: 'praca', title: "Praça d'Armas", pos: { x: -3, y: 0.3, z: 3 }, text: `Coração do forte: aqui se formava a tropa, se liam as ordens e se recebiam visitas, como a do governador espanhol de Mojos, saudado com onze tiros e uma comédia. Ao redor ficam capela, botica, residência do governador e quartéis de oficiais.` },
  { id: 'baluarte', title: 'Os quatro baluartes', pos: { x: -88, y: 'top', z: -88 }, text: `São quatro baluartes, cada um com 14 canhoneiras: 56 bocas de fogo no total. Sabe-se do paradeiro de cerca de 16 canhões. Nenhum disparou em combate: a única 'batalha' do forte foi contra a malária.` },
  { id: 'quartel', title: 'Parque de artilharia', pos: { b: 'Quartel de oficiais V (parque de artilharia)', fx: 0.5, fz: 2.6 }, text: `Sob este conjunto de sete cômodos a arqueologia achou 2.111 balas de canhão de vários calibres, lanças, baionetas e lâminas de sabre. Perto do governador, como mandavam os manuais de fortificação.` },
  { id: 'capela', title: 'Capela', pos: { b: 'Capela', fx: 0.5, fz: 0.5 }, text: `Pequena capela com espadana para o sino. O sino dobrava de meia em meia hora quando morria alguém importante, por três dias. O grande sino de bronze foi levado após o abandono do forte.` },
  { id: 'hospital', title: 'Hospital', pos: { b: 'Hospital', fx: 0.5, fz: 0.2 }, text: `Enfermaria com sangrador, cirurgião e botica. Os inventários listam unguentos, jalapa (purgante), ruibarbo (laxante) e pedra-ume (antisséptico). A malária era a maior inimiga: matou centenas na obra, inclusive o engenheiro Sambuceti.` },
  { id: 'botica', title: 'Botica', pos: { b: 'Botica e casa do boticário', fx: 0.5, fz: 0.15 }, text: `Quina, a casca amarga contra as febres, era remédio indispensável. A farmácia misturava saber europeu e saberes indígenas: raízes, resinas e as 'drogas do sertão'.` },
  { id: 'armazens', title: 'Armazéns Reais', pos: { x: -5, y: 0.3, z: 41 }, text: `Os dois primeiros edifícios erguidos. Um guardava víveres, outro petrechos e armamento. O inventário de 1818 cita 131 ferramentas de pedreiro, 137 canos de arma, 114 algemas e correntes, 97 botijas de barro, 148 frascos de azeite de boto e 15 botões de fardas.` },
  { id: 'alojamentos', title: 'Alojamentos de soldados', pos: { x: 40.7, y: 0.3, z: -22 }, text: `Quatro alojamentos com divisórias de taipa e piso de tijoleira. A tropa recebia rações regulares; o soldo vinha atrasado e era gasto em compras fiadas na Provedoria. Muitos soldados eram colonos pobres, forros, mestiços e degredados.` },
  { id: 'calabouco', title: 'Calabouço', pos: { b: 'Calabouço', fx: 0.5, fz: 0.5 }, text: `Prisão ao lado do portão. O inventário de 1818 registra 114 algemas, colares e correntes com calcetas, usados tanto para presos quanto para escravizados.` },
  { id: 'cisterna', title: 'Cisterna', pos: { x: 20, y: 0.3, z: 3.7 }, text: `Reserva de água para a guarnição. A população do forte chegava a 700 ou 800 pessoas: militares, funcionários, clero, comerciantes, indígenas, forros e escravizados.` },
  { id: 'polvora', title: 'Casa de pólvora', pos: { x: 131, y: 0, z: 40 }, text: `A casa de pólvora foi construída fora das muralhas, para que uma explosão não destruísse o forte inteiro.` },
  { id: 'senzalas', title: 'Senzalas e roças', pos: { x: 148, y: 0, z: -30 }, text: `Fora das muralhas ficavam senzalas, engenhos, oficinas e roças de milho, feijão, mandioca e cana. Muito do que a guarnição comia saía dali, trabalhado principalmente por mão de obra escravizada.` },
  { id: 'roca', title: 'Roças e engenho', pos: { x: 108, y: 0.1, z: -150 }, text: `Terra, fogo e água: o engenho transformava cana em açúcar e aguardente, moeda de troca e ração. As cheias do rio podiam destruir plantações inteiras.` },
];

// ---------------------------------------------------------------- pontos de exame (estilo Resident Evil)
// cond: função; once: bool. act(): efeito. pos como em INFO.
export const EXAMINE = [
  { id: 'arm_sacos', b: 'Armazém de mantimentos', fx: 0.25, fz: 0.7, label: 'Examinar os sacos', cond: () => f('armOpen'), once: true,
    text: `Pilhas de sacos de algodão, costurados com linha grossa. Atrás deles, um novelo de fio.`, act: () => G.give('fio') },
  { id: 'arm_tintas', b: 'Armazém de mantimentos', fx: 0.75, fz: 0.7, label: 'Examinar a prateleira', cond: () => f('armOpen'), once: true,
    text: `Frascos de tintura vegetal: vermelho de madeira e um azul-escuro. Servem para tingir camisetas e, quem sabe, uma bandeira.`, act: () => G.give('tintas') },
  { id: 'arm_fumo', b: 'Armazém de mantimentos', fx: 0.75, fz: 0.3, label: 'Examinar o barril', cond: () => f('armOpen'), once: true,
    text: `Sob a lona, rolos de fumo de corda. O fumo costuma ser usado para animar a tropa quando falta feijão.`, act: () => G.give('fumo') },
  { id: 'arm_caixote', b: 'Armazém de mantimentos', fx: 0.25, fz: 0.3, label: 'Examinar o caixote lacrado', cond: () => f('armOpen'), once: true,
    text: `Um caixote com o selo da Provedoria. Dentro, envolto em pano, o Livro de Registro dos Armazéns Reais.`, act: () => G.give('livro') },
  { id: 'pet_marcas', b: 'Armazém de petrechos e armamentos', fx: 0.5, fz: 0.4, label: 'Examinar a porta e o telhado', cond: () => f('armOpen'), once: true,
    text: `A fechadura antiga tem marcas de ferro, não de chave: foi forçada. No beiral há marcas de escada, antigas. Foi por aqui que entraram em 1778.`, act: () => { setf('clueFecho'); G.toast('Pista: a fechadura foi forçada por fora.'); } },
  { id: 'cal_palha', b: 'Calabouço', fx: 0.5, fz: 0.55, label: 'Examinar a palha', cond: () => f('briefed'), once: true,
    text: `Sob a palha do chão, esquecido por algum preso, um pedaço dobrado de papel de nanquim: parte da planta de Sambuceti.`, act: () => G.give('frag2') },
  { id: 'res_mesa', b: 'Residência do governador', fx: 0.5, fz: 0.6, label: 'Examinar a mesa', cond: () => f('residOpen'), once: true,
    text: `Sobre a mesa, papéis do engenheiro. Um fragmento da planta, e uma cópia da devassa de 1778: a fechadura fora achada pregada na porta de uma senzala, e dois cativos acusados sem mais provas.`, act: () => { G.give('frag4'); setf('knowDevassa'); } },
  { id: 'cisterna_x', x: 20, y: 0.3, z: 8.6, label: 'Examinar a borda da cisterna', cond: () => has('planta'), once: true,
    text: `Na quarta pedra da borda, a argamassa é nova. Com o canivete você levanta a pedra: dentro, embrulhada em pano, uma chave pequena de ferro escuro.`, act: () => G.give('chavePaiol') },
  { id: 'pol_barril', b: 'Casa de pólvora (extramuros)', fx: 0.3, fz: 0.5, label: 'Examinar o barril', cond: () => f('polOpen'), once: true,
    text: `Barris de pólvora bem selados, secos e frescos. O engenheiro cuidou até disso.`, act: () => G.give('polvora') },
  { id: 'pol_carta', b: 'Casa de pólvora (extramuros)', fx: 0.7, fz: 0.5, label: 'Examinar o caixote de papéis', cond: () => f('polOpen'), once: true,
    text: `Uma carta dobrada, com a letra trêmula de Sambuceti: "A quem terminar esta obra: não deixem que ela seja só pedra. Que seja casa de quem a ergueu, e que se lembrem do nome de cada um que adoeceu aqui. Seu criado, D. Sambuceti."`, act: () => { G.give('carta'); } },
];

// portas trancadas: edifício, item, flag
export const DOORS = [
  { b: 'Armazém de mantimentos', key: 'chaveArm', flag: 'armOpen', msg: 'Trancada. O almoxarife guarda a chave.' },
  { b: 'Armazém de petrechos e armamentos', key: 'chaveArm', flag: 'armOpen', msg: 'Trancada. O almoxarife guarda a chave.' },
  { b: 'Residência do governador', key: 'chaveResid', flag: 'residOpen', msg: 'Trancada. O comandante tem a chave.' },
  { b: 'Casa de pólvora (extramuros)', key: 'chavePaiol', flag: 'polOpen', msg: 'Trancada. Precisa da chave do paiol, mais um cadeado de combinação.', lock: true },
];

// ---------------------------------------------------------------- objetivos
export function objective(P) {
  // P: posições nomeadas calculadas pelo jogo
  if (!f('briefed')) return ['Apresente-se ao capitão-engenheiro Ricardo Franco, no parque de artilharia (norte da praça, à esquerda).', P.ricardo];
  if (!f('act1done')) {
    if (!f('sawAlmox')) return ['Fale com o almoxarife Joaquim Mendes, no hospital (muralha oeste, à direita).', P.joaquim];
    if (!has('febrifugo')) {
      if (!f('sawBotic')) return ['Procure o boticário: o almoxarife precisa de remédio.', P.anacleto];
      if (!has('quina')) {
        if (!has('fish') && !f('quinaOk')) return ['Pegue um peixe com Maneco, no porto do rio, e troque por quina com Tiago.', P.maneco];
        return ['Leve o peixe a Tiago, no porto, e troque por casca de quina.', P.tiago];
      }
      return ['Leve a quina ao boticário para preparar o febrífugo.', P.anacleto];
    }
    return ['Leve o febrífugo ao almoxarife, no hospital.', P.joaquim];
  }
  if (!f('act2done')) {
    if (!f('armOpen')) return ['Abra os Armazéns Reais com a chave (ao sul, atrás da residência do governador).', P.armazem];
    if (!has('livro') && !f('residOpen')) return ['Encontre o Livro de Registro no armazém de mantimentos.', P.armazem];
    if (has('livro') && !f('residOpen')) return ['Mostre o Livro de Registro ao comandante Melo.', P.melo];
    const frags = ['frag1', 'frag2', 'frag3', 'frag4'].filter(has).length + (has('planta') ? 4 : 0);
    if (!has('planta') && frags < 4) return [`Reúna os 4 fragmentos da planta (${frags}/4): capela, calabouço, o pescador e a residência.`, P.res];
    if (!has('planta')) return ['Monte a planta de Sambuceti (Inventário).', null];
    if (!has('chavePaiol')) return ['A planta aponta a cisterna: examine a borda.', P.cisterna];
    if (!f('polOpen')) return ['Abra a casa de pólvora, fora das muralhas: chave e cadeado de combinação.', P.polvora];
    return ['Pegue a pólvora na casa de pólvora.', P.polvora];
  }
  const miss = [];
  if (!has('livro')) miss.push('Livro de Registro'); if (!has('planta')) miss.push('Planta'); if (!has('bandeira')) miss.push('Bandeira restaurada'); if (!has('polvora')) miss.push('Pólvora');
  if (miss.length) {
    if (!has('bandeira')) return ['Restaure a bandeira: leve bandeira, fio e tintas ao alfaiate Faustino.', P.faustino];
    return [`Ainda falta: ${miss.join(', ')}.`, P.ricardo];
  }
  return ['Entregue tudo ao capitão Ricardo Franco: é hora da cerimônia.', P.ricardo];
}

// checklist do Diário (Ato II)
export function checklist() {
  const fr = ['frag1', 'frag2', 'frag3', 'frag4'].filter(k => has(k) || has('planta')).length;
  return [
    ['Abrir os Armazéns Reais', f('armOpen')],
    ['Recuperar o Livro de Registro', has('livro') || f('act3')],
    ['Mostrar o livro ao comandante (chave da Residência)', f('residOpen')],
    ['Restaurar a Bandeira real (fio + tintas + alfaiate)', has('bandeira') || f('act3')],
    [`Fragmentos da Planta (${fr}/4)`, has('planta') || fr === 4],
    ['Montar a Planta de Sambuceti', has('planta') || f('act3')],
    ['Chave do Paiol (cisterna)', has('chavePaiol') || f('polOpen')],
    ['Abrir a casa de pólvora (cadeado)', f('polOpen')],
    ['Pegar a pólvora', has('polvora') || f('act3')],
  ];
}

// planta: texto revelado ao montar
export const PLANTA_TEXT = `Ao montar a planta, uma anotação de Sambuceti aparece no canto: "Sob a quarta pedra da cisterna, o ferro que guarda a pólvora." E, mais abaixo: "O cadeado abre a quem sabe contar: quantos baluartes tem o forte; quantas bocas de fogo guarda cada um; quantos metros mede a muralha."`;

// receita da botica
export const RECEITA = {
  texto: 'Receita para as febres do mato: casca de quina em decocção (contra a febre) e algo que acalme o ventre depois do amargo. Nada de purgante forte, pois o doente já está fraco.',
  itens: [
    ['quina', '🌿', 'Casca de quina'],
    ['jalapa', '🌱', 'Jalapa (purgante forte)'],
    ['ruibarbo', '🪴', 'Ruibarbo (acalma o ventre)'],
    ['pedraume', '🪨', 'Pedra-ume (antisséptico)'],
    ['azeite', '🫙', 'Azeite de boto'],
  ],
  certo: ['quina', 'ruibarbo'],
};
export const CODE = [4, 14, 10];
