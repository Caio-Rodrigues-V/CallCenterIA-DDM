-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "instituicao" TEXT NOT NULL,
    "tipo_telefonia" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT false,
    "assistant_vapi_id" TEXT NOT NULL,
    "linha_vapi_id" TEXT NOT NULL,
    "max_tentativas" INTEGER NOT NULL DEFAULT 3,
    "intervalo_minutos" INTEGER NOT NULL DEFAULT 60,
    "janela_inicio" TEXT NOT NULL DEFAULT '08:00',
    "janela_fim" TEXT NOT NULL DEFAULT '18:00',
    "ligacoes_simultaneas" INTEGER NOT NULL DEFAULT 1,
    "ignore_horario" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "nome" TEXT,
    "cpf" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "instituicao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_contacts" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "tentativas_realizadas" INTEGER NOT NULL DEFAULT 0,
    "ultima_tentativa" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "vapi_call_id" TEXT,
    "campaign_contact_id" TEXT,
    "status" TEXT NOT NULL,
    "customer_number" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "ended_reason" TEXT,
    "duration_seconds" INTEGER,
    "custo_total" DOUBLE PRECISION,
    "custo_stt" DOUBLE PRECISION,
    "custo_tts" DOUBLE PRECISION,
    "custo_vapi" DOUBLE PRECISION,
    "success_evaluation" TEXT,
    "transcript" TEXT,
    "recording_url" TEXT,
    "stereo_recording_url" TEXT,
    "summary" TEXT,
    "assistant_id" TEXT,
    "phone_number_id" TEXT,
    "structured_name" TEXT,
    "structured_rating_label" TEXT,
    "structured_rating_text" TEXT,
    "structured_purpose" TEXT,
    "structured_main_points" TEXT,
    "metadata_raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_telefone_idx" ON "contacts"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_cpf_telefone_key" ON "contacts"("cpf", "telefone");

-- CreateIndex
CREATE INDEX "campaign_contacts_campaign_id_status_idx" ON "campaign_contacts"("campaign_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_contacts_campaign_id_contact_id_key" ON "campaign_contacts"("campaign_id", "contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "calls_vapi_call_id_key" ON "calls"("vapi_call_id");

-- CreateIndex
CREATE INDEX "calls_started_at_idx" ON "calls"("started_at" DESC);

-- CreateIndex
CREATE INDEX "calls_campaign_contact_id_idx" ON "calls"("campaign_contact_id");

-- CreateIndex
CREATE INDEX "system_logs_created_at_idx" ON "system_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "campaign_contacts" ADD CONSTRAINT "campaign_contacts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_contacts" ADD CONSTRAINT "campaign_contacts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_campaign_contact_id_fkey" FOREIGN KEY ("campaign_contact_id") REFERENCES "campaign_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
